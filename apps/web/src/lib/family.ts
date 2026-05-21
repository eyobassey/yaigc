'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createTransport } from 'nodemailer';
import { z } from 'zod';
import type { FamilyMemberRelationship } from '@prisma/client';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';
import {
  familyWelcomeHtml,
  familyWelcomeText,
  familyWelcomeSubject,
} from '@/lib/email/family-welcome';

const ConvertEnquirySchema = z.object({
  enquiryId: z.string().min(1),
  billingName: z.string().min(1).max(160),
  payerFirstName: z.string().min(1).max(80),
  payerLastName: z.string().min(1).max(80),
  relationshipToRecipient: z.enum([
    'daughter',
    'son',
    'partner',
    'spouse',
    'sibling',
    'grandchild',
    'other',
  ]),
  recipientFirstName: z.string().min(1).max(80),
  recipientLastName: z.string().min(1).max(80),
  recipientPreferredName: z.string().max(80).optional(),
  intakeNotes: z.string().max(4000).optional(),
});

export type ConvertEnquiryState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

/**
 * Convert a triaged Enquiry into a Family + Recipient + FamilyMember.
 *
 * Transactional:
 *   - find-or-create a User by the enquiry email (default role family_payer)
 *   - create Family (status=prospect, billingName)
 *   - create FamilyMember (role=payer, relationshipToRecipient,
 *     isPrimaryContact=true) linking the User to the Family
 *   - create Recipient with the operator-collected basics
 *   - move Enquiry to status=converted with convertedToFamilyId
 *
 * If any step fails the whole thing rolls back and the Enquiry stays at
 * status=triaged. Audit entries are written outside the transaction —
 * a write-amplification cost worth paying for clear non-atomic logs.
 */
export async function convertEnquiryToFamily(
  _prev: ConvertEnquiryState,
  formData: FormData,
): Promise<ConvertEnquiryState> {
  const operator = await getSessionUser();
  // Defensive — this action is only reachable via /ops/* which is gated.
  // If a misconfigured edge case reaches here without a session, bail.
  if (!operator) {
    return { ok: false, errors: { _form: 'Not signed in.' } };
  }

  const raw = {
    enquiryId: String(formData.get('enquiryId') ?? ''),
    billingName: String(formData.get('billingName') ?? '').trim(),
    payerFirstName: String(formData.get('payerFirstName') ?? '').trim(),
    payerLastName: String(formData.get('payerLastName') ?? '').trim(),
    relationshipToRecipient: String(
      formData.get('relationshipToRecipient') ?? '',
    ).trim(),
    recipientFirstName: String(formData.get('recipientFirstName') ?? '').trim(),
    recipientLastName: String(formData.get('recipientLastName') ?? '').trim(),
    recipientPreferredName:
      String(formData.get('recipientPreferredName') ?? '').trim() || undefined,
    intakeNotes: String(formData.get('intakeNotes') ?? '').trim() || undefined,
  };

  const parsed = ConvertEnquirySchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if (typeof k === 'string' && !(k in errors)) {
        errors[k] = issue.message;
      }
    }
    return { ok: false, errors, values: raw as unknown as Record<string, string> };
  }

  const d = parsed.data;

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: d.enquiryId },
  });
  if (!enquiry) {
    return { ok: false, errors: { _form: 'Enquiry not found.' } };
  }
  if (enquiry.status !== 'triaged') {
    return {
      ok: false,
      errors: {
        _form: `Enquiry must be triaged before converting. Current status: ${enquiry.status}.`,
      },
    };
  }

  // Run the four writes atomically. If any throws, the transaction rolls
  // back and the Enquiry stays at status=triaged.
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: enquiry.email },
      update: {
        firstName: d.payerFirstName,
        lastName: d.payerLastName,
      },
      create: {
        email: enquiry.email,
        firstName: d.payerFirstName,
        lastName: d.payerLastName,
        role: 'family_payer',
        name: `${d.payerFirstName} ${d.payerLastName}`,
      },
    });

    const family = await tx.family.create({
      data: {
        status: 'prospect',
        billingName: d.billingName,
        intakeNotes: d.intakeNotes ?? null,
      },
    });

    const member = await tx.familyMember.create({
      data: {
        familyId: family.id,
        userId: user.id,
        role: 'payer',
        relationshipToRecipient: d.relationshipToRecipient as FamilyMemberRelationship,
        isPrimaryContact: true,
      },
    });

    const recipient = await tx.recipient.create({
      data: {
        familyId: family.id,
        firstName: d.recipientFirstName,
        lastName: d.recipientLastName,
        preferredName: d.recipientPreferredName ?? null,
      },
    });

    await tx.enquiry.update({
      where: { id: enquiry.id },
      data: {
        status: 'converted',
        convertedToFamilyId: family.id,
      },
    });

    return { user, family, member, recipient };
  });

  // Audit each of the four creations + the enquiry transition. Outside
  // the transaction so a single audit failure does not roll back the
  // (already-correct) business state.
  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'Family',
    targetId: result.family.id,
    afterState: {
      status: result.family.status,
      billingName: result.family.billingName,
    },
    metadata: { event: 'family_created', fromEnquiryId: enquiry.id },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'Recipient',
    targetId: result.recipient.id,
    afterState: {
      familyId: result.family.id,
      firstName: result.recipient.firstName,
      lastName: result.recipient.lastName,
    },
    metadata: { event: 'recipient_created', fromEnquiryId: enquiry.id },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'FamilyMember',
    targetId: result.member.id,
    afterState: {
      familyId: result.family.id,
      userId: result.user.id,
      role: result.member.role,
      relationshipToRecipient: result.member.relationshipToRecipient,
    },
    metadata: { event: 'family_member_created', fromEnquiryId: enquiry.id },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'state_change',
    targetType: 'Enquiry',
    targetId: enquiry.id,
    beforeState: { status: 'triaged', convertedToFamilyId: null },
    afterState: { status: 'converted', convertedToFamilyId: result.family.id },
    metadata: { event: 'enquiry_converted', familyId: result.family.id },
  });

  // Welcome email to the payer. Best-effort: if Brevo is down we still
  // succeed (the Family exists in the DB; the operator can resend
  // manually or call). Audit-logged whether it sent or not.
  await sendFamilyWelcomeEmail({
    payerEmail: enquiry.email,
    payerFirstName: d.payerFirstName,
    billingName: d.billingName,
    recipientFirstName: d.recipientFirstName,
    recipientLastName: d.recipientLastName,
    recipientPreferredName: d.recipientPreferredName ?? null,
    relationshipToRecipient: d.relationshipToRecipient,
    familyId: result.family.id,
  });

  revalidatePath('/ops');
  revalidatePath('/ops/enquiries');
  revalidatePath(`/ops/enquiries/${enquiry.id}`);
  revalidatePath('/ops/families');
  revalidatePath(`/ops/families/${result.family.id}`);

  redirect(`/ops/families/${result.family.id}`);
}

async function sendFamilyWelcomeEmail(params: {
  payerEmail: string;
  payerFirstName: string;
  billingName: string;
  recipientFirstName: string;
  recipientLastName: string;
  recipientPreferredName: string | null;
  relationshipToRecipient: string;
  familyId: string;
}): Promise<void> {
  try {
    const transport = createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASSWORD!,
      },
    });

    const payload = {
      payerFirstName: params.payerFirstName,
      payerEmail: params.payerEmail,
      billingName: params.billingName,
      recipientFirstName: params.recipientFirstName,
      recipientLastName: params.recipientLastName,
      recipientPreferredName: params.recipientPreferredName,
      relationshipToRecipient: params.relationshipToRecipient,
    };

    const result = await transport.sendMail({
      to: params.payerEmail,
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
      subject: familyWelcomeSubject(),
      text: familyWelcomeText(payload),
      html: familyWelcomeHtml(payload),
    });

    const failed = result.rejected.concat(result.pending).filter(Boolean);
    if (failed.length) {
      console.error(
        '[family] welcome email rejected for',
        failed.join(', '),
        'family',
        params.familyId,
      );
      return;
    }

    await audit({
      actorType: 'system',
      actorId: null,
      actionType: 'state_change',
      targetType: 'Family',
      targetId: params.familyId,
      metadata: {
        event: 'welcome_email_sent',
        to: params.payerEmail,
      },
    });
  } catch (err) {
    console.error(
      '[family] welcome email failed for',
      params.payerEmail,
      'family',
      params.familyId,
      err instanceof Error ? err.message : String(err),
    );
  }
}
