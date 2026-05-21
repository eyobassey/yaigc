'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type {
  FamilyMemberRelationship,
  FamilyMemberRole,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';

// -------------------------------------------------------------------------
// ADD FAMILY MEMBER
// -------------------------------------------------------------------------

const AddMemberSchema = z.object({
  familyId: z.string().min(1),
  email: z.string().email('Enter a valid email address.').max(160),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  role: z.enum(['payer', 'viewer']),
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

export type AddMemberState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function addFamilyMember(
  _prev: AddMemberState,
  formData: FormData,
): Promise<AddMemberState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    familyId: String(formData.get('familyId') ?? ''),
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    firstName: String(formData.get('firstName') ?? '').trim(),
    lastName: String(formData.get('lastName') ?? '').trim(),
    role: String(formData.get('role') ?? '').trim(),
    relationshipToRecipient: String(
      formData.get('relationshipToRecipient') ?? '',
    ).trim(),
    isPrimaryContact: (formData.get('isPrimaryContact') as string) || undefined,
  };

  const parsed = AddMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: Object.fromEntries(
        parsed.error.issues.flatMap((i) => {
          const k = i.path[0];
          return typeof k === 'string' ? [[k, i.message]] : [];
        }),
      ),
      values: raw as unknown as Record<string, string>,
    };
  }
  const d = parsed.data;

  const family = await prisma.family.findUnique({ where: { id: d.familyId } });
  if (!family) return { ok: false, errors: { _form: 'Family not found.' } };

  // Reject duplicates by (familyId, userId). The unique constraint would
  // throw at the DB layer, but checking first lets us return a friendly
  // error inline rather than a 500.
  const existingUser = await prisma.user.findUnique({
    where: { email: d.email },
  });
  if (existingUser) {
    const dup = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId: d.familyId, userId: existingUser.id },
      },
    });
    if (dup) {
      return {
        ok: false,
        errors: {
          email: 'This person is already a member of this family.',
        },
        values: raw as unknown as Record<string, string>,
      };
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: d.email },
      update: {
        firstName: d.firstName,
        lastName: d.lastName,
      },
      create: {
        email: d.email,
        firstName: d.firstName,
        lastName: d.lastName,
        name: `${d.firstName} ${d.lastName}`,
        // Default account role tracks intent: a payer becomes
        // family_payer; a viewer becomes family_viewer.
        role: d.role === 'payer' ? 'family_payer' : 'family_viewer',
      },
    });

    const isPrimary = d.isPrimaryContact === 'on';

    // If this new member is being promoted to primary, demote the
    // existing primary first so the invariant "exactly one primary per
    // family" holds. Done inside the transaction.
    if (isPrimary) {
      await tx.familyMember.updateMany({
        where: { familyId: d.familyId, isPrimaryContact: true },
        data: { isPrimaryContact: false },
      });
    }

    const member = await tx.familyMember.create({
      data: {
        familyId: d.familyId,
        userId: user.id,
        role: d.role as FamilyMemberRole,
        relationshipToRecipient:
          d.relationshipToRecipient as FamilyMemberRelationship,
        isPrimaryContact: isPrimary,
      },
    });

    return { user, member };
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'FamilyMember',
    targetId: result.member.id,
    afterState: {
      familyId: d.familyId,
      userId: result.user.id,
      role: result.member.role,
      relationshipToRecipient: result.member.relationshipToRecipient,
      isPrimaryContact: result.member.isPrimaryContact,
    },
    metadata: { event: 'family_member_added', email: d.email },
  });

  revalidatePath('/ops/families');
  revalidatePath(`/ops/families/${d.familyId}`);
  redirect(`/ops/families/${d.familyId}`);
}

// -------------------------------------------------------------------------
// ADD RECIPIENT
// -------------------------------------------------------------------------

const AddRecipientSchema = z.object({
  familyId: z.string().min(1),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  preferredName: z.string().max(80).optional(),
});

export type AddRecipientState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function addRecipient(
  _prev: AddRecipientState,
  formData: FormData,
): Promise<AddRecipientState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    familyId: String(formData.get('familyId') ?? ''),
    firstName: String(formData.get('firstName') ?? '').trim(),
    lastName: String(formData.get('lastName') ?? '').trim(),
    preferredName:
      String(formData.get('preferredName') ?? '').trim() || undefined,
  };

  const parsed = AddRecipientSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: Object.fromEntries(
        parsed.error.issues.flatMap((i) => {
          const k = i.path[0];
          return typeof k === 'string' ? [[k, i.message]] : [];
        }),
      ),
      values: raw as unknown as Record<string, string>,
    };
  }
  const d = parsed.data;

  const family = await prisma.family.findUnique({ where: { id: d.familyId } });
  if (!family) return { ok: false, errors: { _form: 'Family not found.' } };

  const recipient = await prisma.recipient.create({
    data: {
      familyId: d.familyId,
      firstName: d.firstName,
      lastName: d.lastName,
      preferredName: d.preferredName ?? null,
    },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'Recipient',
    targetId: recipient.id,
    afterState: {
      familyId: d.familyId,
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      preferredName: recipient.preferredName,
    },
    metadata: { event: 'recipient_added' },
  });

  revalidatePath('/ops/families');
  revalidatePath(`/ops/families/${d.familyId}`);
  // Redirect to the recipient's edit page so the operator can immediately
  // fill in address, consents, profile detail.
  redirect(
    `/ops/families/${d.familyId}/recipients/${recipient.id}/edit`,
  );
}
