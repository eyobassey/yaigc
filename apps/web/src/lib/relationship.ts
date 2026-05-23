'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser, isOperator, requireFamilyPayer } from '@/lib/auth-helpers';
import {
  relationshipNoteHtml,
  relationshipNoteText,
  relationshipNoteSubject,
} from '@/lib/email/relationship-note';

// R.2 - "Shape of the relationship" memo (May 2026), section 4.1 + 4.2.
//
// Two prose fields the family payer edits inline on /family/recipient.
// Both are deliberately held lightly: no length-against-a-cap, no scoring,
// no required fields, no progress UI. Every save that changes the body
// appends a FamilyTextRevision so the operator team can read month-1
// against month-12 - the memo (s5.1) names the change-over-time signal
// as meaningful information for the team.

// Generous ceiling. Not a "you must be under this" cap, just a guard so
// the form can't be used to wedge megabytes of text into the DB.
const MAX_BODY = 8000;

export type SaveProseState = { ok: boolean; error?: string };

// ---------------------------------------------------------------
// About the recipient (per-recipient)
// ---------------------------------------------------------------

const AboutSchema = z.object({
  recipientId: z.string().min(1),
  body: z.string().max(MAX_BODY),
});

export async function saveAboutTheRecipient(
  _prev: SaveProseState,
  formData: FormData,
): Promise<SaveProseState> {
  const { user, family } = await requireFamilyPayer('/family/recipient');
  const parsed = AboutSchema.safeParse({
    recipientId: String(formData.get('recipientId') ?? ''),
    body: String(formData.get('body') ?? ''),
  });
  if (!parsed.success) return { ok: false, error: 'Could not save.' };

  const recipient = await prisma.recipient.findFirst({
    where: { id: parsed.data.recipientId, familyId: family.id, deletedAt: null },
    select: { id: true, aboutTheRecipient: true },
  });
  if (!recipient) return { ok: false, error: 'Not found.' };

  const newBody = parsed.data.body.trim();
  const before = recipient.aboutTheRecipient ?? '';
  // No-op on blurs that didn't actually edit anything. Avoids polluting
  // the revision history with empty diffs every time the user tabs out.
  if (newBody === before) return { ok: true };

  await prisma.$transaction([
    prisma.recipient.update({
      where: { id: recipient.id },
      data: { aboutTheRecipient: newBody || null },
    }),
    prisma.familyTextRevision.create({
      data: {
        familyId: family.id,
        recipientId: recipient.id,
        field: 'aboutTheRecipient',
        body: newBody,
        authorUserId: user.id,
      },
    }),
  ]);

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'update',
    targetType: 'Recipient',
    targetId: recipient.id,
    metadata: {
      event: 'about_the_recipient_saved',
      length: newBody.length,
      cleared: newBody.length === 0,
    },
  });

  revalidatePath('/family/recipient');
  return { ok: true };
}

// ---------------------------------------------------------------
// What we are hoping for (per-family)
// ---------------------------------------------------------------

const HopesSchema = z.object({
  body: z.string().max(MAX_BODY),
});

export async function saveWhatWeAreHopingFor(
  _prev: SaveProseState,
  formData: FormData,
): Promise<SaveProseState> {
  const { user, family } = await requireFamilyPayer('/family/recipient');
  const parsed = HopesSchema.safeParse({
    body: String(formData.get('body') ?? ''),
  });
  if (!parsed.success) return { ok: false, error: 'Could not save.' };

  const familyRow = await prisma.family.findUnique({
    where: { id: family.id },
    select: { id: true, whatWeAreHopingFor: true },
  });
  if (!familyRow) return { ok: false, error: 'Not found.' };

  const newBody = parsed.data.body.trim();
  const before = familyRow.whatWeAreHopingFor ?? '';
  if (newBody === before) return { ok: true };

  await prisma.$transaction([
    prisma.family.update({
      where: { id: familyRow.id },
      data: { whatWeAreHopingFor: newBody || null },
    }),
    prisma.familyTextRevision.create({
      data: {
        familyId: familyRow.id,
        recipientId: null,
        field: 'whatWeAreHopingFor',
        body: newBody,
        authorUserId: user.id,
      },
    }),
  ]);

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'update',
    targetType: 'Family',
    targetId: familyRow.id,
    metadata: {
      event: 'what_we_are_hoping_for_saved',
      length: newBody.length,
      cleared: newBody.length === 0,
    },
  });

  revalidatePath('/family/recipient');
  return { ok: true };
}

// ---------------------------------------------------------------
// Operator cadence control (R.4)
// ---------------------------------------------------------------
//
// Family.checkInCadenceDays drives the "check-ins due this week"
// card on the operator Today dashboard (R.5). Operators can change
// the cadence per family from /ops/families/[id]. Allowed values
// are a small set of presets the dropdown surfaces; raw arbitrary
// integers are not exposed in the UI but the schema doesn't ban
// them, so safety lives in this action.

const CADENCE_PRESETS = new Set([0, 30, 90, 180, 365]);

const CadenceSchema = z.object({
  familyId: z.string().min(1),
  cadenceDays: z.coerce.number().int().nonnegative(),
});

export async function setFamilyCheckInCadence(
  formData: FormData,
): Promise<void> {
  const actor = await getSessionUser();
  if (!actor) return;
  if (!isOperator(actor.role)) return;

  const parsed = CadenceSchema.safeParse({
    familyId: String(formData.get('familyId') ?? ''),
    cadenceDays: String(formData.get('cadenceDays') ?? ''),
  });
  if (!parsed.success) return;
  if (!CADENCE_PRESETS.has(parsed.data.cadenceDays)) return;

  const before = await prisma.family.findUnique({
    where: { id: parsed.data.familyId },
    select: { id: true, checkInCadenceDays: true },
  });
  if (!before) return;
  if (before.checkInCadenceDays === parsed.data.cadenceDays) return;

  await prisma.family.update({
    where: { id: before.id },
    data: { checkInCadenceDays: parsed.data.cadenceDays },
  });

  await audit({
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionType: 'update',
    targetType: 'Family',
    targetId: before.id,
    beforeState: { checkInCadenceDays: before.checkInCadenceDays },
    afterState: { checkInCadenceDays: parsed.data.cadenceDays },
    metadata: { event: 'check_in_cadence_changed' },
  });

  revalidatePath(`/ops/families/${before.id}`);
}

// ---------------------------------------------------------------
// Log a relationship note (R.5)
// ---------------------------------------------------------------
//
// One server action covers both kinds of call - fifth-visit
// reflection and periodic check-in. The callType is supplied by the
// form on /ops/families/[id]/log-call; allowed values gate the
// downstream bookkeeping (which timestamp to bump). After the write
// we email the family payer with the operator's note verbatim,
// audit-log the call, and bounce the operator back to /ops so the
// "due this week" card refreshes.
//
// Memo s4.3 frames this as "the operator's note from the call".
// No scoring, no satisfaction rating, no quantitative measurement;
// section 2.3 explains why those would corrupt the post-visit
// reports they would be measuring.

const NOTE_MIN = 5;
const NOTE_MAX = 4000;

const LogNoteSchema = z.object({
  familyId: z.string().min(1),
  callType: z.enum(['fifth_visit', 'check_in', 'other']),
  body: z
    .string()
    .trim()
    .min(NOTE_MIN, 'Write a short note before saving.')
    .max(NOTE_MAX),
});

function buildTransport() {
  return createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
}

export type LogNoteState = {
  ok: boolean;
  error?: string;
  values?: { body?: string };
};

export async function logRelationshipNote(
  _prev: LogNoteState,
  formData: FormData,
): Promise<LogNoteState> {
  const actor = await getSessionUser();
  if (!actor) return { ok: false, error: 'Sign in first.' };
  if (!isOperator(actor.role)) {
    return { ok: false, error: 'Only operators can log a call.' };
  }

  const parsed = LogNoteSchema.safeParse({
    familyId: String(formData.get('familyId') ?? ''),
    callType: String(formData.get('callType') ?? ''),
    body: String(formData.get('body') ?? ''),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Could not save the note.',
      values: { body: String(formData.get('body') ?? '') },
    };
  }
  const { familyId, callType, body } = parsed.data;

  // Pull the family + the payer + an active recipient first-name so
  // the email salutation feels right.
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: {
      members: {
        where: { role: 'payer', deletedAt: null },
        take: 1,
        include: {
          user: { select: { id: true, email: true, firstName: true } },
        },
      },
    },
  });
  if (!family) return { ok: false, error: 'Family not found.' };
  const payer = family.members[0]?.user;
  if (!payer) {
    return { ok: false, error: 'No payer on file - call them directly first.' };
  }

  const now = new Date();
  const noteRow = await prisma.$transaction(async (tx) => {
    const created = await tx.relationshipNote.create({
      data: {
        familyId,
        operatorUserId: actor.id,
        callType,
        body,
      },
      select: { id: true, createdAt: true },
    });
    // Bump the right bookkeeping timestamp so the Today dashboard
    // queries can compute "due this week" without re-scanning the
    // notes table.
    if (callType === 'fifth_visit') {
      await tx.family.update({
        where: { id: familyId },
        data: { lastReflectionAt: now },
      });
    } else if (callType === 'check_in') {
      await tx.family.update({
        where: { id: familyId },
        data: { lastCheckInAt: now },
      });
    }
    return created;
  });

  await audit({
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionType: 'create',
    targetType: 'RelationshipNote',
    targetId: noteRow.id,
    metadata: {
      event: 'relationship_note_logged',
      familyId,
      callType,
      bodyLength: body.length,
    },
  });

  // Best-effort email. A transient SMTP hiccup must not roll back the
  // note - the family will still see it on the next email exchange,
  // and the operator console always shows the timeline.
  try {
    const transport = buildTransport();
    const payload = {
      recipientFirstName: payer.firstName,
      operatorFirstName: actor.firstName ?? null,
      noteBody: body,
      noteKind: callType,
    };
    await transport.sendMail({
      to: payer.email,
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
      subject: relationshipNoteSubject(payload),
      text: relationshipNoteText(payload),
      html: relationshipNoteHtml(payload),
    });
  } catch (err) {
    console.error('[relationship] note email failed', { familyId, err });
  }

  revalidatePath('/ops');
  revalidatePath(`/ops/families/${familyId}`);
  redirect(`/ops/families/${familyId}`);
}
