'use server';

import { redirect } from 'next/navigation';
import { createTransport } from 'nodemailer';
import { z } from 'zod';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import {
  enquiryReceivedHtml,
  enquiryReceivedText,
  enquiryReceivedSubject,
} from '@/lib/email/enquiry-received';

/**
 * Public contact-form schema. Postcode is loose: we accept anything that
 * looks vaguely UK-shaped so we do not block legitimate visitors over
 * formatting. Operator-side normalisation can happen later.
 */
const ContactFormSchema = z.object({
  name: z.string().min(1, 'Please tell us your name.').max(120),
  email: z.string().email('Please enter a valid email address.').max(160),
  phone: z.string().max(40).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  message: z
    .string()
    .min(10, 'Please tell us a bit more so we can help.')
    .max(4000),
  consentMarketing: z.union([z.literal('on'), z.literal('off')]).optional(),
});

export type ContactFormState = {
  ok: boolean;
  errors?: Partial<Record<keyof z.infer<typeof ContactFormSchema>, string>>;
  values?: Record<string, string>;
};

/**
 * Server action invoked by /contact's form. Validates, creates an Enquiry
 * row with source=contact_form, writes an audit entry, and redirects to
 * the confirmation page. Throws never; surfaces field errors as state.
 */
export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: (formData.get('phone') as string) || null,
    postcode: (formData.get('postcode') as string) || null,
    message: String(formData.get('message') ?? ''),
    consentMarketing: (formData.get('consentMarketing') as string) || undefined,
  };

  const parsed = ContactFormSchema.safeParse(raw);
  if (!parsed.success) {
    type FieldKey = keyof NonNullable<ContactFormState['errors']>;
    const fieldErrors: NonNullable<ContactFormState['errors']> = {};
    for (const issue of parsed.error.issues) {
      const first = issue.path[0];
      if (typeof first !== 'string') continue;
      const key = first as FieldKey;
      if (!(key in fieldErrors)) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      errors: fieldErrors,
      values: {
        name: raw.name,
        email: raw.email,
        phone: raw.phone ?? '',
        postcode: raw.postcode ?? '',
        message: raw.message,
      },
    };
  }

  const data = parsed.data;
  const enquiry = await prisma.enquiry.create({
    data: {
      source: 'contact_form',
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      postcode: data.postcode?.trim().toUpperCase() || null,
      message: data.message.trim(),
      consentMarketing: data.consentMarketing === 'on',
    },
    select: {
      id: true,
      source: true,
      name: true,
      email: true,
      status: true,
      consentMarketing: true,
    },
  });

  await audit({
    actorType: 'user',
    actorId: null, // anonymous public submitter
    actionType: 'create',
    targetType: 'Enquiry',
    targetId: enquiry.id,
    afterState: {
      source: enquiry.source,
      status: enquiry.status,
      name: enquiry.name,
      email: enquiry.email,
      consentMarketing: enquiry.consentMarketing,
    },
    metadata: { event: 'contact_form_submitted' },
  });

  // Confirmation email to the submitter. Best-effort: if Brevo SMTP is
  // unreachable we still consider the submission a success because the
  // Enquiry row + audit entry are already persisted. The operator can
  // follow up by phone using the captured contact info.
  await sendEnquiryConfirmation({
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() || null,
    postcode: data.postcode?.trim().toUpperCase() || null,
    message: data.message.trim(),
    enquiryId: enquiry.id,
  });

  redirect(`/contact/thanks?id=${enquiry.id}`);
}

async function sendEnquiryConfirmation(params: {
  name: string;
  email: string;
  phone: string | null;
  postcode: string | null;
  message: string;
  enquiryId: string;
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

    const result = await transport.sendMail({
      to: params.email,
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
      subject: enquiryReceivedSubject(),
      text: enquiryReceivedText(params),
      html: enquiryReceivedHtml(params),
    });

    const failed = result.rejected.concat(result.pending).filter(Boolean);
    if (failed.length) {
      console.error(
        '[enquiry] confirmation email rejected for',
        failed.join(', '),
        'enquiry',
        params.enquiryId,
      );
      return;
    }

    await audit({
      actorType: 'system',
      actorId: null,
      actionType: 'state_change',
      targetType: 'Enquiry',
      targetId: params.enquiryId,
      metadata: { event: 'confirmation_email_sent', to: params.email },
    });
  } catch (err) {
    console.error(
      '[enquiry] confirmation email failed for',
      params.email,
      'enquiry',
      params.enquiryId,
      err instanceof Error ? err.message : String(err),
    );
  }
}
