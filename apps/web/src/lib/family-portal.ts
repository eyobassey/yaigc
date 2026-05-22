'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { isOperator, requireFamilyPayer } from '@/lib/auth-helpers';
import {
  familyMemberInvitedHtml,
  familyMemberInvitedText,
  familyMemberInvitedSubject,
} from '@/lib/email/family-member-invited';
import {
  CANONICAL_INTERESTS,
  CANONICAL_MOBILITY,
  CANONICAL_DIETARY,
  serialiseTagged,
  tagToFormKey,
} from '@/lib/recipient-tags';

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
  interestsOther: z.string().trim().max(2000).optional(),
  thingsToKnow: z.string().trim().max(2000).optional(),
  mobilityOther: z.string().trim().max(2000).optional(),
  healthNotes: z.string().trim().max(2000).optional(),
  dietaryOther: z.string().trim().max(2000).optional(),
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
    'interestsOther',
    'thingsToKnow',
    'mobilityOther',
    'healthNotes',
    'dietaryOther',
    'religiousObservance',
    'addressLine1',
    'addressLine2',
    'addressCity',
    'addressPostcode',
    'consentEvidence',
  ]) {
    raw[key] = String(formData.get(key) ?? '').trim() || undefined;
  }
  // Collect ticked tags across each tag category. Each checkbox name
  // is <category>_<tagKey>.
  const collectTicks = (prefix: string, list: readonly string[]) => {
    const ticks = new Set<string>();
    for (const tag of list) {
      if (formData.get(`${prefix}_${tagToFormKey(tag)}`) === 'on') ticks.add(tag);
    }
    return ticks;
  };
  const interestTicks = collectTicks('interest', CANONICAL_INTERESTS);
  const mobilityTicks = collectTicks('mobility', CANONICAL_MOBILITY);
  const dietaryTicks = collectTicks('dietary', CANONICAL_DIETARY);
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
  const interestsCombined = serialiseTagged(CANONICAL_INTERESTS, interestTicks, d.interestsOther);
  const mobilityCombined = serialiseTagged(CANONICAL_MOBILITY, mobilityTicks, d.mobilityOther);
  const dietaryCombined = serialiseTagged(CANONICAL_DIETARY, dietaryTicks, d.dietaryOther);
  const update: Record<string, unknown> = {
    firstName: d.firstName,
    lastName: d.lastName,
    preferredName: d.preferredName ?? null,
    pronouns: d.pronouns ?? null,
    phone: d.phone ?? null,
    dateOfBirth: d.dateOfBirth ? new Date(`${d.dateOfBirth}T00:00:00.000Z`) : null,
    interests: interestsCombined || null,
    thingsToKnow: d.thingsToKnow ?? null,
    mobility: mobilityCombined || null,
    healthNotes: d.healthNotes ?? null,
    dietary: dietaryCombined || null,
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
// EDIT OWN ACCOUNT (FamilyMember + User name fields)
// -------------------------------------------------------------------------

const RELATIONSHIPS = [
  'daughter',
  'son',
  'partner',
  'spouse',
  'sibling',
  'grandchild',
  'other',
] as const;

const EditAccountSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  relationshipToRecipient: z.enum(RELATIONSHIPS).optional().or(z.literal('').transform(() => undefined)),
});

export type EditAccountState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function editFamilyAccount(
  _prev: EditAccountState,
  formData: FormData,
): Promise<EditAccountState> {
  const { user, member, family } = await requireFamilyPayer('/family/account');

  const raw = {
    firstName: String(formData.get('firstName') ?? '').trim(),
    lastName: String(formData.get('lastName') ?? '').trim(),
    relationshipToRecipient:
      String(formData.get('relationshipToRecipient') ?? '').trim() || undefined,
  };

  const parsed = EditAccountSchema.safeParse(raw);
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

  const changed: string[] = [];
  if (d.firstName !== (user.firstName ?? '')) changed.push('firstName');
  if (d.lastName !== (user.lastName ?? '')) changed.push('lastName');
  if ((d.relationshipToRecipient ?? null) !== (member.relationshipToRecipient ?? null)) {
    changed.push('relationshipToRecipient');
  }
  if (changed.length === 0) {
    redirect('/family/account');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { firstName: d.firstName, lastName: d.lastName },
    }),
    prisma.familyMember.update({
      where: { id: member.id },
      data: { relationshipToRecipient: d.relationshipToRecipient ?? null },
    }),
  ]);

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'update',
    targetType: 'FamilyMember',
    targetId: member.id,
    metadata: {
      event: 'family_member_updated',
      changedFields: changed,
      via: 'family_portal',
    },
  });

  revalidatePath('/family');
  revalidatePath('/family/account');
  revalidatePath(`/ops/families/${family.id}`);
  redirect('/family/account');
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

// -------------------------------------------------------------------------
// INVITE another family member (self-serve)
// -------------------------------------------------------------------------

const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Use a valid email address.').max(254),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  relationshipToRecipient: z
    .enum(RELATIONSHIPS)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type InviteState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function inviteFamilyMember(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const { user, family } = await requireFamilyPayer('/family/account/invite');

  const raw = {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    firstName: String(formData.get('firstName') ?? '').trim(),
    lastName: String(formData.get('lastName') ?? '').trim(),
    relationshipToRecipient:
      String(formData.get('relationshipToRecipient') ?? '').trim() || undefined,
  };

  const parsed = InviteSchema.safeParse(raw);
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

  // Conflict checks. We deliberately surface most as the same opaque
  // 'cannot add this email' to avoid leaking who has accounts elsewhere
  // on the platform - only the inviter's own duplicate and 'already on
  // this household' are spelled out.
  const existing = await prisma.user.findUnique({
    where: { email: d.email },
    select: { id: true, role: true, deletedAt: true },
  });

  if (existing) {
    if (existing.id === user.id) {
      return { ok: false, errors: { email: 'That is you.' }, values: raw };
    }
    if (isOperator(existing.role)) {
      return {
        ok: false,
        errors: { email: 'Cannot add this email. Get in touch and we will help.' },
        values: raw,
      };
    }
    const alreadyHere = await prisma.familyMember.findFirst({
      where: { userId: existing.id, familyId: family.id, deletedAt: null },
      select: { id: true },
    });
    if (alreadyHere) {
      return {
        ok: false,
        errors: { email: 'Already on this household.' },
        values: raw,
      };
    }
    const onOtherFamily = await prisma.familyMember.findFirst({
      where: {
        userId: existing.id,
        familyId: { not: family.id },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (onOtherFamily) {
      return {
        ok: false,
        errors: { email: 'Cannot add this email. Get in touch and we will help.' },
        values: raw,
      };
    }
  }

  // Recipient first-name for the email subject + body, picked from the
  // first recipient on the household. Falls back to the billing name.
  const firstRecipient = await prisma.recipient.findFirst({
    where: { familyId: family.id, deletedAt: null },
    select: { firstName: true, preferredName: true },
    orderBy: { firstName: 'asc' },
  });
  const recipientLabel =
    firstRecipient?.preferredName ??
    firstRecipient?.firstName ??
    family.billingName;

  // Atomic: create User if missing, create FamilyMember row.
  const { inviteeUserId, isNewUser } = await prisma.$transaction(async (tx) => {
    let inviteeId = existing?.id;
    let isNew = false;
    if (!inviteeId) {
      const created = await tx.user.create({
        data: {
          email: d.email,
          firstName: d.firstName,
          lastName: d.lastName,
          role: 'family_viewer',
        },
        select: { id: true },
      });
      inviteeId = created.id;
      isNew = true;
    }
    await tx.familyMember.create({
      data: {
        userId: inviteeId,
        familyId: family.id,
        role: 'viewer',
        relationshipToRecipient: d.relationshipToRecipient ?? null,
      },
    });
    return { inviteeUserId: inviteeId, isNewUser: isNew };
  });

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'create',
    targetType: 'FamilyMember',
    targetId: inviteeUserId,
    metadata: {
      event: 'family_member_invited',
      familyId: family.id,
      inviteeEmail: d.email,
      newUser: isNewUser,
      via: 'family_portal',
    },
  });

  // Heads-up email. Best-effort: failure logs but does not unwind the
  // membership (they can still sign in at /sign-in).
  try {
    const transport = createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
    });
    const input = {
      inviteeFirstName: d.firstName,
      inviterFirstName: user.firstName ?? 'A family member',
      familyBillingName: family.billingName,
      recipientFirstName: recipientLabel,
    };
    await transport.sendMail({
      to: d.email,
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
      subject: familyMemberInvitedSubject(input),
      text: familyMemberInvitedText(input),
      html: familyMemberInvitedHtml(input),
    });
    await audit({
      actorType: 'system',
      actorId: null,
      actionType: 'state_change',
      targetType: 'FamilyMember',
      targetId: inviteeUserId,
      metadata: { event: 'family_invite_email_sent', to: d.email },
    });
  } catch (err) {
    console.error('[family] invite email failed', { to: d.email, err });
  }

  revalidatePath('/family/account');
  revalidatePath(`/ops/families/${family.id}`);
  redirect('/family/account?invited=1');
}
