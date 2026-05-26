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
import {
  matchEndedToFamilyHtml,
  matchEndedToFamilyText,
  matchEndedToFamilySubject,
  matchEndedToCompanionHtml,
  matchEndedToCompanionText,
  matchEndedToCompanionSubject,
} from '@/lib/email/match-ended';
import {
  matchProposedToFamilyHtml,
  matchProposedToFamilyText,
  matchProposedToFamilySubject,
  matchProposedToCompanionHtml,
  matchProposedToCompanionText,
  matchProposedToCompanionSubject,
} from '@/lib/email/match-proposed';

// -------------------------------------------------------------------------
// PROPOSE A MATCH
// -------------------------------------------------------------------------

const ProposeSchema = z
  .object({
    familyId: z.string().min(1),
    recipientId: z.string().min(1),
    candidateCompanionId: z.string().min(1),
    coverCompanionId: z.string().optional(),
    rationale: z
      .string()
      .min(20, 'Tell us why this companion. A few sentences please.')
      .max(2000),
  })
  .refine(
    (d) => !d.coverCompanionId || d.coverCompanionId !== d.candidateCompanionId,
    {
      message: 'Cover must be a different companion to the primary.',
      path: ['coverCompanionId'],
    },
  );

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
    coverCompanionId: String(formData.get('coverCompanionId') ?? '').trim(),
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
  const [family, recipient, companion, cover] = await Promise.all([
    prisma.family.findUnique({ where: { id: d.familyId } }),
    prisma.recipient.findUnique({ where: { id: d.recipientId } }),
    prisma.companion.findUnique({ where: { id: d.candidateCompanionId } }),
    d.coverCompanionId
      ? prisma.companion.findUnique({ where: { id: d.coverCompanionId } })
      : Promise.resolve(null),
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
  if (d.coverCompanionId) {
    if (!cover || (cover.status !== 'onboarding' && cover.status !== 'active')) {
      return {
        ok: false,
        errors: { coverCompanionId: 'Cover companion is not currently bookable.' },
        values: raw,
      };
    }
  }

  // Single-match-at-a-time per family. Curated, not a marketplace -
  // operator picks one companion and presents them; if declined,
  // operator withdraws and proposes the next one. The check rejects
  // any open Match (proposed status, not yet resolved) on the family,
  // regardless of which companion. Operator can withdraw on the
  // existing match detail page to free the slot.
  const existingOpenForFamily = await prisma.match.findFirst({
    where: { familyId: d.familyId, status: 'proposed' },
    select: { id: true, candidateCompanionId: true },
  });
  if (existingOpenForFamily) {
    const sameCompanion =
      existingOpenForFamily.candidateCompanionId === d.candidateCompanionId;
    return {
      ok: false,
      errors: {
        _form: sameCompanion
          ? 'There is already an open proposal between this family and this companion.'
          : 'This family already has an open proposal. Withdraw it before proposing another candidate.',
      },
    };
  }

  const match = await prisma.match.create({
    data: {
      familyId: d.familyId,
      recipientId: d.recipientId,
      candidateCompanionId: d.candidateCompanionId,
      coverCompanionId: d.coverCompanionId || null,
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
      coverCompanionId: match.coverCompanionId,
      recipientId: match.recipientId,
      status: match.status,
    },
    metadata: { event: 'match_proposed' },
  });

  // Fire match-proposed emails to family + companion so they know to
  // sign in and respond. Best-effort - failures log but do not unwind
  // the proposal itself.
  await sendMatchProposedEmails(match.id);

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

  // For 'accepted': only stamp the timestamps that are still null. If
  // the companion has already accepted via /companion/matches/[id],
  // their response timestamp is preserved.
  const existing = await prisma.match.findUnique({
    where: { id: d.matchId },
    select: { familyResponseAt: true, companionResponseAt: true },
  });

  const result = await prisma.match.updateMany({
    where: { id: d.matchId, status: 'proposed' },
    data: {
      status: d.to,
      ...(d.to === 'accepted'
        ? {
            familyResponseAt: existing?.familyResponseAt ?? now,
            companionResponseAt: existing?.companionResponseAt ?? now,
          }
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
// ASSIGN / CHANGE / CLEAR the cover companion on a Match.
//
// Per SDD Addendum §2: cover is a nudge, not a gate. Acceptance does
// not wait on cover, and visits can start without one. This action is
// how operators close that gap when a cover becomes available, and
// how they swap or remove the cover if circumstances change.
//
// Allowed on matches in status proposed or accepted (not ended,
// withdrawn, or declined). Submitting an empty companionId clears the
// cover. The cover must be a bookable companion and cannot be the
// same as the primary candidate.
// -------------------------------------------------------------------------

const AssignCoverSchema = z.object({
  matchId: z.string().min(1),
  coverCompanionId: z.string().optional(),
});

export async function assignCoverCompanion(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;

  const parsed = AssignCoverSchema.safeParse({
    matchId: String(formData.get('matchId') ?? ''),
    coverCompanionId: String(formData.get('coverCompanionId') ?? '').trim() || undefined,
  });
  if (!parsed.success) return;
  const d = parsed.data;

  const before = await prisma.match.findUnique({
    where: { id: d.matchId },
    select: {
      status: true,
      familyId: true,
      candidateCompanionId: true,
      coverCompanionId: true,
    },
  });
  if (!before) return;
  if (before.status !== 'proposed' && before.status !== 'accepted') return;
  if (d.coverCompanionId === before.candidateCompanionId) return;

  if (d.coverCompanionId) {
    const cover = await prisma.companion.findUnique({
      where: { id: d.coverCompanionId },
      select: { status: true },
    });
    if (!cover || (cover.status !== 'onboarding' && cover.status !== 'active')) {
      return;
    }
  }

  const next = d.coverCompanionId ?? null;
  if (next === before.coverCompanionId) return;

  await prisma.match.update({
    where: { id: d.matchId },
    data: { coverCompanionId: next },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'update',
    targetType: 'Match',
    targetId: d.matchId,
    beforeState: { coverCompanionId: before.coverCompanionId },
    afterState: { coverCompanionId: next },
    metadata: {
      event: 'match_cover_companion_change',
      changeKind: next === null ? 'clear' : before.coverCompanionId === null ? 'assign' : 'swap',
    },
  });

  revalidatePath('/ops');
  revalidatePath('/ops/matches');
  revalidatePath(`/ops/matches/${d.matchId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
  revalidatePath('/family/companion');
  revalidatePath('/companion/matches');
}

// -------------------------------------------------------------------------
// END (un-match) an accepted Match. status: accepted -> ended.
// Cascade-cancels any non-canceled Subscription tied to this match.
// -------------------------------------------------------------------------

const END_REASONS = [
  'not_a_fit',
  'scheduling_conflict',
  'recipient_circumstances_changed',
  'recipient_passed_away',
  'companion_circumstances_changed',
  'safeguarding_concern',
  'other',
] as const;

const EndSchema = z
  .object({
    matchId: z.string().min(1),
    endReason: z.enum(END_REASONS),
    endNote: z.string().max(2000).optional(),
  })
  .refine((d) => d.endReason !== 'other' || (d.endNote && d.endNote.length >= 5), {
    message: 'A note is required when the reason is "other".',
    path: ['endNote'],
  });

export type EndMatchState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function endMatch(
  _prev: EndMatchState,
  formData: FormData,
): Promise<EndMatchState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    matchId: String(formData.get('matchId') ?? ''),
    endReason: String(formData.get('endReason') ?? ''),
    endNote: String(formData.get('endNote') ?? '').trim() || undefined,
  };

  const parsed = EndSchema.safeParse(raw);
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

  const before = await prisma.match.findUnique({
    where: { id: d.matchId },
    include: { subscription: { select: { id: true, status: true } } },
  });
  if (!before || before.status !== 'accepted') {
    return { ok: false, errors: { _form: 'Only accepted matches can be ended.' }, values: raw };
  }

  const now = new Date();
  let cascadedSubscriptionId: string | null = null;

  // Atomic: end the match and cascade-cancel any non-canceled subscription
  // in one transaction so nothing is left in an inconsistent state.
  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: d.matchId },
      data: {
        status: 'ended',
        endedAt: now,
        endReason: d.endReason,
        endNote: d.endNote ?? null,
        endedByOperatorId: operator.id,
      },
    });

    if (before.subscription && before.subscription.status !== 'canceled') {
      await tx.subscription.update({
        where: { id: before.subscription.id },
        data: {
          status: 'canceled',
          endedAt: now,
          cancellationReason: `Match ended: ${d.endReason}`,
        },
      });
      cascadedSubscriptionId = before.subscription.id;
    }
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'state_change',
    targetType: 'Match',
    targetId: d.matchId,
    beforeState: { status: 'accepted' },
    afterState: { status: 'ended' },
    metadata: {
      event: 'match_ended',
      endReason: d.endReason,
      ...(d.endNote ? { note: d.endNote } : {}),
      ...(cascadedSubscriptionId ? { cascadedSubscriptionId } : {}),
      // Hook for Stage O.7.5: surface safeguarding reasons explicitly so a
      // listener / cron job can spin up a SafeguardingCase.
      ...(d.endReason === 'safeguarding_concern' ? { safeguardingHook: true } : {}),
    },
  });

  if (cascadedSubscriptionId) {
    await audit({
      actorType: 'system',
      actorId: null,
      actionType: 'state_change',
      targetType: 'Subscription',
      targetId: cascadedSubscriptionId,
      beforeState: { status: before.subscription?.status },
      afterState: { status: 'canceled' },
      metadata: { event: 'subscription_canceled_by_match_end', matchId: d.matchId },
    });
  }

  await sendMatchEndedEmails(d.matchId, Boolean(cascadedSubscriptionId));

  // O.7.5 hook: safeguarding_concern reason opens a SafeguardingCase.
  // Lazy import to break the cycle.
  if (d.endReason === 'safeguarding_concern') {
    try {
      const { openCaseFromMatchEnd } = await import('@/lib/safeguarding');
      await openCaseFromMatchEnd(d.matchId);
    } catch (err) {
      console.error('[match] safeguarding hook failed', { matchId: d.matchId, err });
    }
  }

  revalidatePath('/ops');
  revalidatePath('/ops/matches');
  revalidatePath(`/ops/matches/${d.matchId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
  if (cascadedSubscriptionId) {
    revalidatePath(`/ops/subscriptions/${cascadedSubscriptionId}`);
  }
  redirect(`/ops/matches/${d.matchId}`);
}

// -------------------------------------------------------------------------
// EMAIL: on Match.ended, notify family + companion
// -------------------------------------------------------------------------

async function sendMatchEndedEmails(
  matchId: string,
  subscriptionCancelled: boolean,
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      family: {
        select: {
          billingName: true,
          members: {
            where: { deletedAt: null },
            include: { user: { select: { email: true } } },
          },
        },
      },
      recipient: { select: { firstName: true, preferredName: true } },
      companion: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
    },
  });
  if (!match || !match.recipient || !match.endReason) return;

  const transport = createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

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
    endReason: match.endReason,
    subscriptionCancelled,
  };
  for (const to of familyEmails) {
    try {
      await transport.sendMail({
        to,
        from,
        subject: matchEndedToFamilySubject(),
        text: matchEndedToFamilyText(familyInput),
        html: matchEndedToFamilyHtml(familyInput),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Match',
        targetId: matchId,
        metadata: { event: 'match_ended_email_sent', audience: 'family', to },
      });
    } catch (err) {
      console.error('[match] ended email to family failed', { to, matchId, err });
    }
  }

  const companionEmail = match.companion.user.email;
  if (companionEmail) {
    const companionInput = {
      companionFirstName: match.companion.firstName,
      familyBillingName: match.family.billingName,
      recipientFirstName: match.recipient.firstName,
      recipientPreferredName: match.recipient.preferredName,
      endReason: match.endReason,
      subscriptionCancelled,
    };
    try {
      await transport.sendMail({
        to: companionEmail,
        from,
        subject: matchEndedToCompanionSubject(),
        text: matchEndedToCompanionText(companionInput),
        html: matchEndedToCompanionHtml(companionInput),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Match',
        targetId: matchId,
        metadata: {
          event: 'match_ended_email_sent',
          audience: 'companion',
          to: companionEmail,
        },
      });
    } catch (err) {
      console.error('[match] ended email to companion failed', {
        to: companionEmail,
        matchId,
        err,
      });
    }
  }
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

// -------------------------------------------------------------------------
// COMPANION-DRIVEN match response. The companion accepts or declines a
// proposed match from /companion/matches/[id]. Family side response is
// still operator-mediated (operator captures it on a phone call) until
// we add a family match-response UI later.
// -------------------------------------------------------------------------

const CompanionRespondSchema = z
  .object({
    matchId: z.string().min(1),
    action: z.enum(['accept', 'decline']),
    note: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.action !== 'decline' || (d.note && d.note.length >= 10), {
    message: 'A short reason is required for decline.',
    path: ['note'],
  });

export type CompanionRespondState = {
  ok: boolean;
  errors?: Record<string, string>;
};

export async function respondToMatchByCompanion(
  _prev: CompanionRespondState,
  formData: FormData,
): Promise<CompanionRespondState> {
  const { requireCompanion } = await import('@/lib/auth-helpers');
  const { user, companion } = await requireCompanion('/companion/matches');

  const parsed = CompanionRespondSchema.safeParse({
    matchId: String(formData.get('matchId') ?? ''),
    action: String(formData.get('action') ?? ''),
    note: String(formData.get('note') ?? '').trim() || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      errors: Object.fromEntries(
        parsed.error.issues.flatMap((i) => {
          const k = i.path[0];
          return typeof k === 'string' ? [[k, i.message]] : [];
        }),
      ),
    };
  }
  const d = parsed.data;

  // Scope: match must belong to this companion + still be in 'proposed'.
  const before = await prisma.match.findUnique({
    where: { id: d.matchId },
    select: {
      status: true,
      candidateCompanionId: true,
      familyId: true,
      familyResponseAt: true,
      companionResponseAt: true,
    },
  });
  if (!before) return { ok: false, errors: { _form: 'Match not found.' } };
  if (before.candidateCompanionId !== companion.id) {
    return { ok: false, errors: { _form: 'Not authorised.' } };
  }
  if (before.status !== 'proposed') {
    return { ok: false, errors: { _form: 'Match is no longer open.' } };
  }

  const now = new Date();

  if (d.action === 'decline') {
    await prisma.match.update({
      where: { id: d.matchId },
      data: {
        status: 'declined',
        companionResponseAt: before.companionResponseAt ?? now,
        declineReason: d.note,
      },
    });
    await audit({
      actorType: 'user',
      actorId: user.id,
      actorRole: user.role,
      actionType: 'state_change',
      targetType: 'Match',
      targetId: d.matchId,
      beforeState: { status: 'proposed' },
      afterState: { status: 'declined' },
      metadata: {
        event: 'match_status_change',
        via: 'companion_portal',
        note: d.note,
      },
    });
    revalidatePath('/companion/matches');
    revalidatePath(`/companion/matches/${d.matchId}`);
    revalidatePath('/ops/matches');
    revalidatePath(`/ops/matches/${d.matchId}`);
    revalidatePath(`/ops/families/${before.familyId}`);
    return { ok: true };
  }

  // Accept: stamp companion's response. Flip to accepted only if family
  // side has already responded; otherwise stay in 'proposed' awaiting
  // the operator to capture the family's response.
  const bothNowAccepted = before.familyResponseAt != null;
  await prisma.match.update({
    where: { id: d.matchId },
    data: {
      companionResponseAt: now,
      ...(bothNowAccepted ? { status: 'accepted' } : {}),
    },
  });

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: bothNowAccepted ? 'state_change' : 'update',
    targetType: 'Match',
    targetId: d.matchId,
    ...(bothNowAccepted
      ? {
          beforeState: { status: 'proposed' },
          afterState: { status: 'accepted' },
        }
      : {}),
    metadata: {
      event: bothNowAccepted
        ? 'match_status_change'
        : 'match_companion_accepted',
      via: 'companion_portal',
    },
  });

  if (bothNowAccepted) {
    await sendMatchConfirmationEmails(d.matchId);
  }

  revalidatePath('/companion/matches');
  revalidatePath(`/companion/matches/${d.matchId}`);
  revalidatePath('/ops/matches');
  revalidatePath(`/ops/matches/${d.matchId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
  return { ok: true };
}

// -------------------------------------------------------------------------
// EMAIL: when a Match is proposed, notify family + companion so they
// know to sign in and respond.
// -------------------------------------------------------------------------

async function sendMatchProposedEmails(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      family: {
        select: {
          billingName: true,
          members: {
            where: { deletedAt: null },
            include: { user: { select: { email: true } } },
          },
        },
      },
      recipient: { select: { firstName: true, preferredName: true } },
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

  const familyEmails = Array.from(
    new Set(
      match.family.members
        .map((m) => m.user.email)
        .filter((e): e is string => Boolean(e)),
    ),
  );
  const familyInput = {
    matchId: match.id,
    recipientFirstName: match.recipient.firstName,
    recipientPreferredName: match.recipient.preferredName,
    companionFirstName: match.companion.firstName,
    companionLastName: match.companion.lastName,
    companionBorough: match.companion.borough,
    companionBio: match.companion.bio,
    rationale: match.rationale,
  };
  for (const to of familyEmails) {
    try {
      await transport.sendMail({
        to,
        from,
        subject: matchProposedToFamilySubject(familyInput),
        text: matchProposedToFamilyText(familyInput),
        html: matchProposedToFamilyHtml(familyInput),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Match',
        targetId: matchId,
        metadata: { event: 'match_proposed_email_sent', audience: 'family', to },
      });
    } catch (err) {
      console.error('[match] proposed email to family failed', { to, matchId, err });
    }
  }

  const companionEmail = match.companion.user.email;
  if (companionEmail) {
    const companionInput = {
      matchId: match.id,
      companionFirstName: match.companion.firstName,
      familyBillingName: match.family.billingName,
      recipientFirstName: match.recipient.firstName,
      recipientPreferredName: match.recipient.preferredName,
      rationale: match.rationale,
    };
    try {
      await transport.sendMail({
        to: companionEmail,
        from,
        subject: matchProposedToCompanionSubject(companionInput),
        text: matchProposedToCompanionText(companionInput),
        html: matchProposedToCompanionHtml(companionInput),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Match',
        targetId: matchId,
        metadata: {
          event: 'match_proposed_email_sent',
          audience: 'companion',
          to: companionEmail,
        },
      });
    } catch (err) {
      console.error('[match] proposed email to companion failed', {
        to: companionEmail,
        matchId,
        err,
      });
    }
  }
}

// -------------------------------------------------------------------------
// FAMILY-DRIVEN match response. Mirror of the companion path; family
// payer accepts or declines from /family/matches/[id].
// -------------------------------------------------------------------------

const FamilyRespondSchema = z
  .object({
    matchId: z.string().min(1),
    action: z.enum(['accept', 'decline']),
    note: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.action !== 'decline' || (d.note && d.note.length >= 10), {
    message: 'A short reason is required for decline.',
    path: ['note'],
  });

export type FamilyRespondState = {
  ok: boolean;
  errors?: Record<string, string>;
};

export async function respondToMatchByFamily(
  _prev: FamilyRespondState,
  formData: FormData,
): Promise<FamilyRespondState> {
  const { requireFamilyPayer } = await import('@/lib/auth-helpers');
  const { user, family } = await requireFamilyPayer('/family/matches');

  const parsed = FamilyRespondSchema.safeParse({
    matchId: String(formData.get('matchId') ?? ''),
    action: String(formData.get('action') ?? ''),
    note: String(formData.get('note') ?? '').trim() || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      errors: Object.fromEntries(
        parsed.error.issues.flatMap((i) => {
          const k = i.path[0];
          return typeof k === 'string' ? [[k, i.message]] : [];
        }),
      ),
    };
  }
  const d = parsed.data;

  const before = await prisma.match.findUnique({
    where: { id: d.matchId },
    select: {
      status: true,
      familyId: true,
      familyResponseAt: true,
      companionResponseAt: true,
    },
  });
  if (!before) return { ok: false, errors: { _form: 'Match not found.' } };
  if (before.familyId !== family.id) {
    return { ok: false, errors: { _form: 'Not authorised.' } };
  }
  if (before.status !== 'proposed') {
    return { ok: false, errors: { _form: 'Match is no longer open.' } };
  }

  const now = new Date();

  if (d.action === 'decline') {
    await prisma.match.update({
      where: { id: d.matchId },
      data: {
        status: 'declined',
        familyResponseAt: before.familyResponseAt ?? now,
        declineReason: d.note,
      },
    });
    await audit({
      actorType: 'user',
      actorId: user.id,
      actorRole: user.role,
      actionType: 'state_change',
      targetType: 'Match',
      targetId: d.matchId,
      beforeState: { status: 'proposed' },
      afterState: { status: 'declined' },
      metadata: { event: 'match_status_change', via: 'family_portal', note: d.note },
    });
    revalidatePath('/family/matches');
    revalidatePath(`/family/matches/${d.matchId}`);
    revalidatePath('/ops/matches');
    revalidatePath(`/ops/matches/${d.matchId}`);
    revalidatePath(`/ops/families/${before.familyId}`);
    return { ok: true };
  }

  // Accept: stamp familyResponseAt. Flip to accepted if companion also
  // responded.
  const bothNowAccepted = before.companionResponseAt != null;
  await prisma.match.update({
    where: { id: d.matchId },
    data: {
      familyResponseAt: now,
      ...(bothNowAccepted ? { status: 'accepted' } : {}),
    },
  });

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: bothNowAccepted ? 'state_change' : 'update',
    targetType: 'Match',
    targetId: d.matchId,
    ...(bothNowAccepted
      ? { beforeState: { status: 'proposed' }, afterState: { status: 'accepted' } }
      : {}),
    metadata: {
      event: bothNowAccepted ? 'match_status_change' : 'match_family_accepted',
      via: 'family_portal',
    },
  });

  if (bothNowAccepted) {
    await sendMatchConfirmationEmails(d.matchId);
  }

  revalidatePath('/family/matches');
  revalidatePath(`/family/matches/${d.matchId}`);
  revalidatePath('/ops/matches');
  revalidatePath(`/ops/matches/${d.matchId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
  return { ok: true };
}
