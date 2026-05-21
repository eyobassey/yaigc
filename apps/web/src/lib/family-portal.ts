'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { requireFamilyPayer } from '@/lib/auth-helpers';

// -------------------------------------------------------------------------
// EDIT RECIPIENT (family-side)
// -------------------------------------------------------------------------
//
// Identity fields, consents, and the free-text things-the-companion-should-
// know are always self-serve. Address fields are gated: editable when the
// family has no active or paused Subscription, locked-to-operator when
// there is one (a companion is on their way; address change with no
// operator in the loop would break the routing).

const EditRecipientSchema = z.object({
  recipientId: z.string().min(1),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  preferredName: z.string().trim().max(80).optional(),
  pronouns: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(40).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  interests: z.string().trim().max(2000).optional(),
  thingsToKnow: z.string().trim().max(2000).optional(),
  mobility: z.string().trim().max(2000).optional(),
  healthNotes: z.string().trim().max(2000).optional(),
  dietary: z.string().trim().max(2000).optional(),
  religiousObservance: z.string().trim().max(2000).optional(),
  // Address fields (validated either way; gate enforced in the handler).
  addressLine1: z.string().trim().max(120).optional(),
  addressLine2: z.string().trim().max(120).optional(),
  addressCity: z.string().trim().max(80).optional(),
  addressPostcode: z.string().trim().max(20).optional(),
  // Consents.
  consentToVisits: z.string().optional(),
  consentToPhotos: z.string().optional(),
  consentToReportSharing: z.string().optional(),
  // Evidence note for the consent audit entry.
  consentEvidence: z.string().trim().max(500).optional(),
});

export type EditRecipientState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function editFamilyRecipient(
  _prev: EditRecipientState,
  formData: FormData,
): Promise<EditRecipientState> {
  const { user, family } = await requireFamilyPayer('/family/recipient');

  const raw: Record<string, string | undefined> = {};
  for (const key of [
    'recipientId',
    'firstName',
    'lastName',
    'preferredName',
    'pronouns',
    'phone',
    'dateOfBirth',
    'interests',
    'thingsToKnow',
    'mobility',
    'healthNotes',
    'dietary',
    'religiousObservance',
    'addressLine1',
    'addressLine2',
    'addressCity',
    'addressPostcode',
    'consentEvidence',
  ]) {
    raw[key] = String(formData.get(key) ?? '').trim() || undefined;
  }
  // Checkboxes come back as 'on' or absent.
  raw.consentToVisits = formData.get('consentToVisits') === 'on' ? 'on' : undefined;
  raw.consentToPhotos = formData.get('consentToPhotos') === 'on' ? 'on' : undefined;
  raw.consentToReportSharing =
    formData.get('consentToReportSharing') === 'on' ? 'on' : undefined;

  const parsed = EditRecipientSchema.safeParse(raw);
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

  // Scope check: recipient must belong to this family.
  const before = await prisma.recipient.findFirst({
    where: { id: d.recipientId, familyId: family.id, deletedAt: null },
  });
  if (!before) {
    return { ok: false, errors: { _form: 'Recipient not found.' }, values: raw };
  }

  // Active-subscription gate on address fields.
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      familyId: family.id,
      status: { in: ['active', 'paused'] },
    },
    select: { id: true },
  });
  const addressLocked = Boolean(activeSubscription);

  // Build update payload + diff for audit.
  const consents = {
    consentToVisits: d.consentToVisits === 'on',
    consentToPhotos: d.consentToPhotos === 'on',
    consentToReportSharing: d.consentToReportSharing === 'on',
  };
  const update: Record<string, unknown> = {
    firstName: d.firstName,
    lastName: d.lastName,
    preferredName: d.preferredName ?? null,
    pronouns: d.pronouns ?? null,
    phone: d.phone ?? null,
    dateOfBirth: d.dateOfBirth ? new Date(`${d.dateOfBirth}T00:00:00.000Z`) : null,
    interests: d.interests ?? null,
    thingsToKnow: d.thingsToKnow ?? null,
    mobility: d.mobility ?? null,
    healthNotes: d.healthNotes ?? null,
    dietary: d.dietary ?? null,
    religiousObservance: d.religiousObservance ?? null,
    ...consents,
  };
  if (!addressLocked) {
    update.addressLine1 = d.addressLine1 ?? null;
    update.addressLine2 = d.addressLine2 ?? null;
    update.addressCity = d.addressCity ?? null;
    update.addressPostcode = d.addressPostcode ?? null;
  }

  // Diff (field-level) for the audit metadata.
  const changedFields: string[] = [];
  const consentChanges: string[] = [];
  for (const [k, v] of Object.entries(update)) {
    const old = (before as Record<string, unknown>)[k];
    const oldNorm =
      old instanceof Date ? old.toISOString().slice(0, 10) : old ?? null;
    const newNorm =
      v instanceof Date ? v.toISOString().slice(0, 10) : v ?? null;
    if (oldNorm !== newNorm) {
      changedFields.push(k);
      if (k.startsWith('consentTo')) consentChanges.push(k);
    }
  }
  if (changedFields.length === 0) {
    redirect('/family/recipient');
  }

  await prisma.recipient.update({
    where: { id: d.recipientId },
    data: update,
  });

  // Two audit entries when consents change: a normal update for the
  // non-consent diff, a separate consent entry for the consents. Same
  // pattern the operator-side edit uses.
  const nonConsentChanges = changedFields.filter((f) => !f.startsWith('consentTo'));
  if (nonConsentChanges.length > 0) {
    await audit({
      actorType: 'user',
      actorId: user.id,
      actorRole: user.role,
      actionType: 'update',
      targetType: 'Recipient',
      targetId: d.recipientId,
      metadata: {
        event: 'recipient_updated',
        changedFields: nonConsentChanges,
        via: 'family_portal',
      },
    });
  }
  if (consentChanges.length > 0) {
    await audit({
      actorType: 'user',
      actorId: user.id,
      actorRole: user.role,
      actionType: 'consent',
      targetType: 'Recipient',
      targetId: d.recipientId,
      metadata: {
        event: 'consent_change',
        changedFields: consentChanges,
        evidence: d.consentEvidence ?? 'self-serve via family portal',
        via: 'family_portal',
      },
    });
  }

  revalidatePath('/family');
  revalidatePath('/family/recipient');
  revalidatePath(`/ops/families/${family.id}`);
  redirect('/family/recipient');
}

// -------------------------------------------------------------------------
// REQUEST PAUSE / CANCEL
// -------------------------------------------------------------------------

const RequestSchema = z.object({
  subscriptionId: z.string().min(1),
  kind: z.enum(['pause', 'cancel']),
  reason: z.string().trim().max(2000).optional(),
});

export async function requestSubscriptionChange(formData: FormData): Promise<void> {
  'use server';
  const { user, family } = await requireFamilyPayer('/family/subscription');

  const parsed = RequestSchema.safeParse({
    subscriptionId: String(formData.get('subscriptionId') ?? ''),
    kind: String(formData.get('kind') ?? ''),
    reason: String(formData.get('reason') ?? '').trim() || undefined,
  });
  if (!parsed.success) return;
  const d = parsed.data;

  // Scope: subscription must belong to this family + be active or paused.
  const sub = await prisma.subscription.findFirst({
    where: {
      id: d.subscriptionId,
      familyId: family.id,
      status: { in: ['active', 'paused'] },
    },
    select: {
      id: true,
      status: true,
      pauseRequestedAt: true,
      cancelRequestedAt: true,
    },
  });
  if (!sub) return;

  const now = new Date();
  if (d.kind === 'pause') {
    if (sub.pauseRequestedAt) return; // already open; idempotent no-op
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        pauseRequestedAt: now,
        pauseRequestedReason: d.reason ?? null,
      },
    });
  } else {
    if (sub.cancelRequestedAt) return;
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        cancelRequestedAt: now,
        cancelRequestedReason: d.reason ?? null,
      },
    });
  }

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'state_change',
    targetType: 'Subscription',
    targetId: sub.id,
    metadata: {
      event:
        d.kind === 'pause'
          ? 'subscription_pause_requested'
          : 'subscription_cancel_requested',
      via: 'family_portal',
      ...(d.reason ? { reason: d.reason } : {}),
    },
  });

  revalidatePath('/family');
  revalidatePath('/family/subscription');
  revalidatePath('/ops');
  revalidatePath(`/ops/families/${family.id}`);
  revalidatePath(`/ops/subscriptions/${sub.id}`);
}
