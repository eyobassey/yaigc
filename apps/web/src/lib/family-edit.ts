'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FamilyMemberRelationship } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';

// -------------------------------------------------------------------------
// Diff helper. Returns only the fields whose value actually changed.
// Booleans / strings / nullable values; not deep.
// -------------------------------------------------------------------------
function diff<T extends Record<string, unknown>>(
  before: T,
  after: T,
): { before: Partial<T>; after: Partial<T>; changedKeys: (keyof T)[] } {
  const b: Partial<T> = {};
  const a: Partial<T> = {};
  const changedKeys: (keyof T)[] = [];
  for (const k of Object.keys(after) as (keyof T)[]) {
    const av = after[k];
    const bv = before[k];
    // Normalise nullish to null for comparison
    const norm = (x: unknown) => (x == null || x === '' ? null : x);
    if (norm(av) !== norm(bv)) {
      b[k] = bv;
      a[k] = av;
      changedKeys.push(k);
    }
  }
  return { before: b, after: a, changedKeys };
}

// -------------------------------------------------------------------------
// FAMILY edit
// -------------------------------------------------------------------------

const FamilyEditSchema = z.object({
  familyId: z.string().min(1),
  billingName: z.string().min(1).max(160),
  intakeNotes: z.string().max(4000).optional(),
  billingAddressLine1: z.string().max(120).optional(),
  billingAddressLine2: z.string().max(120).optional(),
  billingCity: z.string().max(80).optional(),
  billingPostcode: z.string().max(20).optional(),
  billingCountry: z.string().min(2).max(2),
});

export type FamilyEditState = {
  ok: boolean;
  errors?: Record<string, string>;
};

export async function updateFamily(
  _prev: FamilyEditState,
  formData: FormData,
): Promise<FamilyEditState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    familyId: String(formData.get('familyId') ?? ''),
    billingName: String(formData.get('billingName') ?? '').trim(),
    intakeNotes: String(formData.get('intakeNotes') ?? '').trim() || undefined,
    billingAddressLine1:
      String(formData.get('billingAddressLine1') ?? '').trim() || undefined,
    billingAddressLine2:
      String(formData.get('billingAddressLine2') ?? '').trim() || undefined,
    billingCity: String(formData.get('billingCity') ?? '').trim() || undefined,
    billingPostcode:
      String(formData.get('billingPostcode') ?? '').trim().toUpperCase() || undefined,
    billingCountry:
      String(formData.get('billingCountry') ?? 'GB').trim().toUpperCase() || 'GB',
  };

  const parsed = FamilyEditSchema.safeParse(raw);
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

  const before = await prisma.family.findUnique({
    where: { id: d.familyId },
    select: {
      billingName: true,
      intakeNotes: true,
      billingAddressLine1: true,
      billingAddressLine2: true,
      billingCity: true,
      billingPostcode: true,
      billingCountry: true,
    },
  });
  if (!before) return { ok: false, errors: { _form: 'Family not found.' } };

  const after = {
    billingName: d.billingName,
    intakeNotes: d.intakeNotes ?? null,
    billingAddressLine1: d.billingAddressLine1 ?? null,
    billingAddressLine2: d.billingAddressLine2 ?? null,
    billingCity: d.billingCity ?? null,
    billingPostcode: d.billingPostcode ?? null,
    billingCountry: d.billingCountry,
  };

  const change = diff(before, after);
  if (change.changedKeys.length === 0) {
    redirect(`/ops/families/${d.familyId}`);
  }

  await prisma.family.update({
    where: { id: d.familyId },
    data: after,
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'update',
    targetType: 'Family',
    targetId: d.familyId,
    beforeState: change.before,
    afterState: change.after,
    metadata: {
      event: 'family_updated',
      changedFields: change.changedKeys as string[],
    },
  });

  revalidatePath('/ops/families');
  revalidatePath(`/ops/families/${d.familyId}`);
  redirect(`/ops/families/${d.familyId}`);
}

// -------------------------------------------------------------------------
// RECIPIENT edit
// -------------------------------------------------------------------------

const RecipientEditSchema = z.object({
  recipientId: z.string().min(1),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  preferredName: z.string().max(80).optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().max(40).optional(),
  pronouns: z.string().max(40).optional(),
  interests: z.string().max(4000).optional(),
  thingsToKnow: z.string().max(4000).optional(),
  mobility: z.string().max(4000).optional(),
  healthNotes: z.string().max(4000).optional(),
  dietary: z.string().max(4000).optional(),
  religiousObservance: z.string().max(2000).optional(),
  addressLine1: z.string().max(120).optional(),
  addressLine2: z.string().max(120).optional(),
  addressCity: z.string().max(80).optional(),
  addressPostcode: z.string().max(20).optional(),
  addressCountry: z.string().min(2).max(2),
  consentToVisits: z.union([z.literal('on'), z.literal('off')]).optional(),
  consentToPhotos: z.union([z.literal('on'), z.literal('off')]).optional(),
  consentToReportSharing: z
    .union([z.literal('on'), z.literal('off')])
    .optional(),
  consentEvidence: z.string().max(1000).optional(),
});

export type RecipientEditState = {
  ok: boolean;
  errors?: Record<string, string>;
};

export async function updateRecipient(
  _prev: RecipientEditState,
  formData: FormData,
): Promise<RecipientEditState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const get = (k: string) => String(formData.get(k) ?? '').trim();
  const opt = (k: string) => get(k) || undefined;

  const raw = {
    recipientId: get('recipientId'),
    firstName: get('firstName'),
    lastName: get('lastName'),
    preferredName: opt('preferredName'),
    dateOfBirth: opt('dateOfBirth'),
    phone: opt('phone'),
    pronouns: opt('pronouns'),
    interests: opt('interests'),
    thingsToKnow: opt('thingsToKnow'),
    mobility: opt('mobility'),
    healthNotes: opt('healthNotes'),
    dietary: opt('dietary'),
    religiousObservance: opt('religiousObservance'),
    addressLine1: opt('addressLine1'),
    addressLine2: opt('addressLine2'),
    addressCity: opt('addressCity'),
    addressPostcode: opt('addressPostcode'),
    addressCountry: (opt('addressCountry') ?? 'GB').toUpperCase(),
    consentToVisits: (formData.get('consentToVisits') as string) || undefined,
    consentToPhotos: (formData.get('consentToPhotos') as string) || undefined,
    consentToReportSharing:
      (formData.get('consentToReportSharing') as string) || undefined,
    consentEvidence: opt('consentEvidence'),
  };

  const parsed = RecipientEditSchema.safeParse(raw);
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

  const before = await prisma.recipient.findUnique({
    where: { id: d.recipientId },
  });
  if (!before) return { ok: false, errors: { _form: 'Recipient not found.' } };

  // Postcode normalised on save.
  const after = {
    firstName: d.firstName,
    lastName: d.lastName,
    preferredName: d.preferredName ?? null,
    dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
    phone: d.phone ?? null,
    pronouns: d.pronouns ?? null,
    interests: d.interests ?? null,
    thingsToKnow: d.thingsToKnow ?? null,
    mobility: d.mobility ?? null,
    healthNotes: d.healthNotes ?? null,
    dietary: d.dietary ?? null,
    religiousObservance: d.religiousObservance ?? null,
    addressLine1: d.addressLine1 ?? null,
    addressLine2: d.addressLine2 ?? null,
    addressCity: d.addressCity ?? null,
    addressPostcode: d.addressPostcode?.toUpperCase() ?? null,
    addressCountry: d.addressCountry,
    consentToVisits: d.consentToVisits === 'on',
    consentToPhotos: d.consentToPhotos === 'on',
    consentToReportSharing: d.consentToReportSharing === 'on',
  };

  // Split into "regular update fields" vs "consent fields" so they get
  // logged with separate actionTypes (update vs consent per SDD §12.7.1).
  const CONSENT_KEYS = [
    'consentToVisits',
    'consentToPhotos',
    'consentToReportSharing',
  ] as const;

  const beforeBare: Record<string, unknown> = {};
  const afterBare: Record<string, unknown> = {};
  for (const key of Object.keys(after) as Array<keyof typeof after>) {
    if ((CONSENT_KEYS as readonly string[]).includes(key as string)) continue;
    beforeBare[key as string] = (before as Record<string, unknown>)[key as string];
    afterBare[key as string] = after[key];
  }

  const beforeConsent: Record<string, unknown> = {};
  const afterConsent: Record<string, unknown> = {};
  for (const key of CONSENT_KEYS) {
    beforeConsent[key] = (before as Record<string, unknown>)[key];
    afterConsent[key] = after[key];
  }

  const updateDiff = diff(beforeBare, afterBare);
  const consentDiff = diff(beforeConsent, afterConsent);

  if (updateDiff.changedKeys.length === 0 && consentDiff.changedKeys.length === 0) {
    redirect(`/ops/families/${before.familyId}`);
  }

  await prisma.recipient.update({
    where: { id: d.recipientId },
    data: after,
  });

  if (updateDiff.changedKeys.length > 0) {
    await audit({
      actorType: 'user',
      actorId: operator.id,
      actorRole: operator.role,
      actionType: 'update',
      targetType: 'Recipient',
      targetId: d.recipientId,
      beforeState: updateDiff.before,
      afterState: updateDiff.after,
      metadata: {
        event: 'recipient_updated',
        changedFields: updateDiff.changedKeys as string[],
      },
    });
  }

  if (consentDiff.changedKeys.length > 0) {
    await audit({
      actorType: 'user',
      actorId: operator.id,
      actorRole: operator.role,
      actionType: 'consent',
      targetType: 'Recipient',
      targetId: d.recipientId,
      beforeState: consentDiff.before,
      afterState: consentDiff.after,
      metadata: {
        event: 'consent_change',
        changedFields: consentDiff.changedKeys as string[],
        ...(d.consentEvidence ? { evidence: d.consentEvidence } : {}),
      },
    });
  }

  revalidatePath('/ops/families');
  revalidatePath(`/ops/families/${before.familyId}`);
  redirect(`/ops/families/${before.familyId}`);
}

// -------------------------------------------------------------------------
// FAMILY MEMBER edit
// -------------------------------------------------------------------------

const FamilyMemberEditSchema = z.object({
  memberId: z.string().min(1),
  relationshipToRecipient: z.enum([
    'daughter',
    'son',
    'partner',
    'spouse',
    'sibling',
    'grandchild',
    'other',
  ]),
  isPrimaryContact: z.union([z.literal('on'), z.literal('off')]).optional(),
});

export type FamilyMemberEditState = {
  ok: boolean;
  errors?: Record<string, string>;
};

export async function updateFamilyMember(
  _prev: FamilyMemberEditState,
  formData: FormData,
): Promise<FamilyMemberEditState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    memberId: String(formData.get('memberId') ?? ''),
    relationshipToRecipient: String(
      formData.get('relationshipToRecipient') ?? '',
    ).trim(),
    isPrimaryContact:
      (formData.get('isPrimaryContact') as string) || undefined,
  };

  const parsed = FamilyMemberEditSchema.safeParse(raw);
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

  const before = await prisma.familyMember.findUnique({
    where: { id: d.memberId },
  });
  if (!before) return { ok: false, errors: { _form: 'Member not found.' } };

  const after = {
    relationshipToRecipient:
      d.relationshipToRecipient as FamilyMemberRelationship,
    isPrimaryContact: d.isPrimaryContact === 'on',
  };

  const change = diff(
    {
      relationshipToRecipient: before.relationshipToRecipient,
      isPrimaryContact: before.isPrimaryContact,
    },
    after,
  );
  if (change.changedKeys.length === 0) {
    redirect(`/ops/families/${before.familyId}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.familyMember.update({
      where: { id: d.memberId },
      data: after,
    });
    // Only one primary contact per family. If we just promoted this
    // member to primary, demote the others.
    if (after.isPrimaryContact && !before.isPrimaryContact) {
      await tx.familyMember.updateMany({
        where: {
          familyId: before.familyId,
          id: { not: d.memberId },
          isPrimaryContact: true,
        },
        data: { isPrimaryContact: false },
      });
    }
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'update',
    targetType: 'FamilyMember',
    targetId: d.memberId,
    beforeState: change.before,
    afterState: change.after,
    metadata: {
      event: 'family_member_updated',
      changedFields: change.changedKeys as string[],
    },
  });

  revalidatePath('/ops/families');
  revalidatePath(`/ops/families/${before.familyId}`);
  redirect(`/ops/families/${before.familyId}`);
}
