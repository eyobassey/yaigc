'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';
import {
  matchConfirmedToFamilyHtml,
  matchConfirmedToFamilyText,
  matchConfirmedToFamilySubject,
  matchConfirmedToCompanionHtml,
  matchConfirmedToCompanionText,
  matchConfirmedToCompanionSubject,
} from '@/lib/email/match-confirmed';

// -------------------------------------------------------------------------
// PROPOSE A MATCH
// -------------------------------------------------------------------------

const ProposeSchema = z.object({
  familyId: z.string().min(1),
  recipientId: z.string().min(1),
  candidateCompanionId: z.string().min(1),
  rationale: z
    .string()
    .min(20, 'Tell us why this companion. A few sentences please.')
    .max(2000),
});

export type ProposeMatchState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function proposeMatch(
  _prev: ProposeMatchState,
  formData: FormData,
): Promise<ProposeMatchState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    familyId: String(formData.get('familyId') ?? ''),
    recipientId: String(formData.get('recipientId') ?? ''),
    candidateCompanionId: String(formData.get('candidateCompanionId') ?? ''),
    rationale: String(formData.get('rationale') ?? '').trim(),
  };

  const parsed = ProposeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: Object.fromEntries(
        parsed.error.issues.flatMap((i) => {
          const k = i.path[0];
          return typeof k === 'string' ? [[k, i.message]] : [];
        }),
      ),
      values: raw,
    };
  }
  const d = parsed.data;

  // Defensive: ensure the recipient belongs to the family and the
  // companion is in a usable state.
  const [family, recipient, companion] = await Promise.all([
    prisma.family.findUnique({ where: { id: d.familyId } }),
    prisma.recipient.findUnique({ where: { id: d.recipientId } }),
    prisma.companion.findUnique({ where: { id: d.candidateCompanionId } }),
  ]);
  if (!family) return { ok: false, errors: { _form: 'Family not found.' } };
  if (!recipient || recipient.familyId !== family.id) {
    return { ok: false, errors: { recipientId: 'Recipient does not belong to this family.' } };
  }
  if (!companion || (companion.status !== 'onboarding' && companion.status !== 'active')) {
    return {
      ok: false,
      errors: {
        candidateCompanionId: 'Companion is not currently bookable.',
      },
    };
  }

  // Avoid duplicate open proposals: a Family should not have two open
  // proposals against the same Companion at once.
  const existingOpen = await prisma.match.findFirst({
    where: {
      familyId: d.familyId,
      candidateCompanionId: d.candidateCompanionId,
      status: 'proposed',
    },
  });
  if (existingOpen) {
    return {
      ok: false,
      errors: {
        _form: 'There is already an open proposal between this family and this companion.',
      },
    };
  }

  const match = await prisma.match.create({
    data: {
      familyId: d.familyId,
      recipientId: d.recipientId,
      candidateCompanionId: d.candidateCompanionId,
      proposedByOperatorId: operator.id,
      rationale: d.rationale,
    },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'Match',
    targetId: match.id,
    afterState: {
      familyId: match.familyId,
      candidateCompanionId: match.candidateCompanionId,
      recipientId: match.recipientId,
      status: match.status,
    },
    metadata: { event: 'match_proposed' },
  });

  revalidatePath('/ops');
  revalidatePath('/ops/matches');
  revalidatePath(`/ops/families/${match.familyId}`);
  redirect(`/ops/matches/${match.id}`);
}

// -------------------------------------------------------------------------
// TRANSITION (accept / decline / withdraw)
// -------------------------------------------------------------------------

const TransitionSchema = z.object({
  matchId: z.string().min(1),
  to: z.enum(['accepted', 'declined', 'withdrawn']),
  note: z.string().max(2000).optional(),
});

export async function transitionMatch(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;

  const parsed = TransitionSchema.safeParse({
    matchId: String(formData.get('matchId') ?? ''),
    to: String(formData.get('to') ?? ''),
    note: String(formData.get('note') ?? '').trim() || undefined,
  });
  if (!parsed.success) return;
  const d = parsed.data;

  const before = await prisma.match.findUnique({
    where: { id: d.matchId },
    select: { status: true, familyId: true },
  });
  if (!before || before.status !== 'proposed') return;

  const now = new Date();
  const isDecline = d.to === 'declined';

  const result = await prisma.match.updateMany({
    where: { id: d.matchId, status: 'proposed' },
    data: {
      status: d.to,
      ...(d.to === 'accepted'
        ? { familyResponseAt: now, companionResponseAt: now }
        : {}),
      ...(isDecline ? { declineReason: d.note ?? '(no reason given)' } : {}),
    },
  });

  if (result.count === 1) {
    await audit({
      actorType: 'user',
      actorId: operator.id,
      actorRole: operator.role,
      actionType: 'state_change',
      targetType: 'Match',
      targetId: d.matchId,
      beforeState: { status: 'proposed' },
      afterState: { status: d.to },
      metadata: {
        event: 'match_status_change',
        ...(d.note ? { note: d.note } : {}),
      },
    });

    if (d.to === 'accepted') {
      await sendMatchConfirmationEmails(d.matchId);
    }
  }

  revalidatePath('/ops');
  revalidatePath('/ops/matches');
  revalidatePath(`/ops/matches/${d.matchId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
}

// -------------------------------------------------------------------------
// EMAIL: on Match.accepted, confirm to family (all members) and companion
// -------------------------------------------------------------------------

async function sendMatchConfirmationEmails(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      family: {
        select: {
          id: true,
          billingName: true,
          members: {
            where: { deletedAt: null },
            include: { user: { select: { email: true } } },
          },
        },
      },
      recipient: {
        select: { firstName: true, lastName: true, preferredName: true },
      },
      companion: {
        select: {
          firstName: true,
          lastName: true,
          borough: true,
          bio: true,
          user: { select: { email: true } },
        },
      },
    },
  });
  if (!match || !match.recipient) return;

  const transport = createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

  // Family side: send to every active member (payer + any household
  // members). Dedupe by email in case the same address appears twice.
  const familyEmails = Array.from(
    new Set(
      match.family.members
        .map((m) => m.user.email)
        .filter((e): e is string => Boolean(e)),
    ),
  );
  const familyInput = {
    recipientFirstName: match.recipient.firstName,
    recipientPreferredName: match.recipient.preferredName,
    companionFirstName: match.companion.firstName,
    companionLastName: match.companion.lastName,
    companionBorough: match.companion.borough,
    companionBio: match.companion.bio,
  };
  for (const to of familyEmails) {
    try {
      await transport.sendMail({
        to,
        from,
        subject: matchConfirmedToFamilySubject(familyInput),
        text: matchConfirmedToFamilyText(familyInput),
        html: matchConfirmedToFamilyHtml(familyInput),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Match',
        targetId: matchId,
        metadata: { event: 'match_confirmation_email_sent', audience: 'family', to },
      });
    } catch (err) {
      console.error('[match] family confirmation email failed', { to, matchId, err });
    }
  }

  // Companion side.
  const companionEmail = match.companion.user.email;
  if (companionEmail) {
    const companionInput = {
      companionFirstName: match.companion.firstName,
      familyBillingName: match.family.billingName,
      recipientFirstName: match.recipient.firstName,
      recipientPreferredName: match.recipient.preferredName,
    };
    try {
      await transport.sendMail({
        to: companionEmail,
        from,
        subject: matchConfirmedToCompanionSubject(companionInput),
        text: matchConfirmedToCompanionText(companionInput),
        html: matchConfirmedToCompanionHtml(companionInput),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Match',
        targetId: matchId,
        metadata: {
          event: 'match_confirmation_email_sent',
          audience: 'companion',
          to: companionEmail,
        },
      });
    } catch (err) {
      console.error('[match] companion confirmation email failed', {
        to: companionEmail,
        matchId,
        err,
      });
    }
  }
}
