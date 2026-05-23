'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { requireFamilyPayer } from '@/lib/auth-helpers';

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
