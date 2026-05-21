'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createTransport } from 'nodemailer';
import { z } from 'zod';
import type {
  CompanionApplicationStatus,
  CompanionBorough,
  CompanionEngagementType,
} from '@prisma/client';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';
import {
  companionApplicationReceivedHtml,
  companionApplicationReceivedText,
  companionApplicationReceivedSubject,
} from '@/lib/email/companion-application-received';

// -------------------------------------------------------------------------
// PUBLIC: submit a companion application
// -------------------------------------------------------------------------

const ApplicationSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').max(80),
  lastName: z.string().min(1, 'Last name is required.').max(80),
  email: z.string().email('Enter a valid email address.').max(160),
  phone: z.string().min(7, 'Enter a phone number.').max(40),
  postcode: z.string().min(2, 'Enter a postcode.').max(20),
  availabilitySummary: z.string().min(5, 'Tell us roughly when you are free.').max(2000),
  whyJoinReason: z.string().min(20, 'A few sentences please.').max(4000),
  aboutYou: z.string().min(20, 'A few sentences please.').max(4000),
  rightToWork: z
    .union([z.literal('on'), z.literal('off')])
    .refine((v) => v === 'on', {
      message: 'You must confirm right to work in the UK.',
    }),
  backgroundCheckConsent: z
    .union([z.literal('on'), z.literal('off')])
    .refine((v) => v === 'on', {
      message: 'We need your consent to run an Enhanced DBS check.',
    }),
});

export type ApplicationState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function submitCompanionApplication(
  _prev: ApplicationState,
  formData: FormData,
): Promise<ApplicationState> {
  const get = (k: string) => String(formData.get(k) ?? '').trim();

  const raw = {
    firstName: get('firstName'),
    lastName: get('lastName'),
    email: get('email').toLowerCase(),
    phone: get('phone'),
    postcode: get('postcode').toUpperCase(),
    availabilitySummary: get('availabilitySummary'),
    whyJoinReason: get('whyJoinReason'),
    aboutYou: get('aboutYou'),
    rightToWork: (formData.get('rightToWork') as string) || 'off',
    backgroundCheckConsent:
      (formData.get('backgroundCheckConsent') as string) || 'off',
  };

  const parsed = ApplicationSchema.safeParse(raw);
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

  const application = await prisma.companionApplication.create({
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      postcode: d.postcode,
      availabilitySummary: d.availabilitySummary,
      whyJoinReason: d.whyJoinReason,
      aboutYou: d.aboutYou,
      rightToWork: true,
      backgroundCheckConsent: true,
    },
  });

  await audit({
    actorType: 'user',
    actorId: null,
    actionType: 'create',
    targetType: 'CompanionApplication',
    targetId: application.id,
    afterState: {
      status: application.status,
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
    },
    metadata: { event: 'companion_application_submitted' },
  });

  // Confirmation email — best-effort.
  try {
    const transport = createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASSWORD!,
      },
    });
    await transport.sendMail({
      to: d.email,
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
      subject: companionApplicationReceivedSubject(),
      text: companionApplicationReceivedText(d),
      html: companionApplicationReceivedHtml(d),
    });
    await audit({
      actorType: 'system',
      actorId: null,
      actionType: 'state_change',
      targetType: 'CompanionApplication',
      targetId: application.id,
      metadata: {
        event: 'application_confirmation_email_sent',
        to: d.email,
      },
    });
  } catch (err) {
    console.error(
      '[companion] confirmation email failed for',
      d.email,
      'application',
      application.id,
      err instanceof Error ? err.message : String(err),
    );
  }

  redirect(`/companions/join/thanks?id=${application.id}`);
}

// -------------------------------------------------------------------------
// OPERATOR: transition application status
// -------------------------------------------------------------------------

const ALLOWED_NEXT: Record<
  CompanionApplicationStatus,
  CompanionApplicationStatus[]
> = {
  received: ['in_triage', 'declined', 'withdrawn'],
  in_triage: ['phone_screen', 'declined', 'withdrawn', 'received'],
  phone_screen: ['interview', 'declined', 'withdrawn', 'in_triage'],
  interview: ['vetting', 'declined', 'withdrawn', 'phone_screen'],
  vetting: ['complete', 'declined', 'withdrawn', 'interview'],
  complete: ['archived' as CompanionApplicationStatus, 'withdrawn'],
  declined: ['in_triage'],
  withdrawn: ['received'],
};

const TransitionSchema = z.object({
  applicationId: z.string().min(1),
  to: z.enum([
    'received',
    'in_triage',
    'phone_screen',
    'interview',
    'vetting',
    'complete',
    'declined',
    'withdrawn',
  ]),
  note: z.string().max(2000).optional(),
});

export async function transitionApplication(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;

  const raw = {
    applicationId: String(formData.get('applicationId') ?? ''),
    to: String(formData.get('to') ?? ''),
    note: String(formData.get('note') ?? '').trim() || undefined,
  };
  const parsed = TransitionSchema.safeParse(raw);
  if (!parsed.success) return;
  const d = parsed.data;

  const before = await prisma.companionApplication.findUnique({
    where: { id: d.applicationId },
    select: { status: true },
  });
  if (!before) return;

  const allowed = ALLOWED_NEXT[before.status] ?? [];
  if (!allowed.includes(d.to)) return;

  // Decline transitions require a reason. The note doubles as the reason
  // when targeting declined; we persist it on the row and in the log.
  const isDecline = d.to === 'declined';

  const result = await prisma.companionApplication.updateMany({
    where: { id: d.applicationId, status: before.status },
    data: {
      status: d.to,
      ...(isDecline ? { declineReason: d.note ?? '(no reason given)' } : {}),
    },
  });

  if (result.count === 1) {
    await audit({
      actorType: 'user',
      actorId: operator.id,
      actorRole: operator.role,
      actionType: 'state_change',
      targetType: 'CompanionApplication',
      targetId: d.applicationId,
      beforeState: { status: before.status },
      afterState: { status: d.to },
      metadata: {
        event: 'application_status_change',
        ...(d.note ? { note: d.note } : {}),
      },
    });
  }

  revalidatePath('/ops');
  revalidatePath('/ops/companions');
  revalidatePath(`/ops/companions/${d.applicationId}`);
}

// -------------------------------------------------------------------------
// OPERATOR: save triage notes
// -------------------------------------------------------------------------

const NotesSchema = z.object({
  applicationId: z.string().min(1),
  triageNotes: z.string().max(4000).optional(),
});

export async function updateApplicationNotes(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;

  const parsed = NotesSchema.safeParse({
    applicationId: String(formData.get('applicationId') ?? ''),
    triageNotes: String(formData.get('triageNotes') ?? '').trim() || undefined,
  });
  if (!parsed.success) return;
  const d = parsed.data;

  const before = await prisma.companionApplication.findUnique({
    where: { id: d.applicationId },
    select: { triageNotes: true },
  });
  if (!before) return;

  const nextNotes = d.triageNotes ?? null;
  if ((before.triageNotes ?? null) === nextNotes) return;

  await prisma.companionApplication.update({
    where: { id: d.applicationId },
    data: { triageNotes: nextNotes },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'update',
    targetType: 'CompanionApplication',
    targetId: d.applicationId,
    beforeState: { triageNotes: before.triageNotes },
    afterState: { triageNotes: nextNotes },
    metadata: { event: 'triage_notes_updated' },
  });

  revalidatePath(`/ops/companions/${d.applicationId}`);
}

// -------------------------------------------------------------------------
// OPERATOR: approve application -> create Companion
// -------------------------------------------------------------------------

const ApproveSchema = z.object({
  applicationId: z.string().min(1),
  borough: z.enum(['south_manchester', 'trafford', 'stockport', 'salford']),
  engagementType: z.enum(['self_employed', 'worker', 'employed']),
  hourlyRate: z.coerce.number().min(10).max(60),
  bio: z.string().max(2000).optional(),
});

export type ApproveState = {
  ok: boolean;
  errors?: Record<string, string>;
};

export async function approveCompanionApplication(
  _prev: ApproveState,
  formData: FormData,
): Promise<ApproveState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const parsed = ApproveSchema.safeParse({
    applicationId: String(formData.get('applicationId') ?? ''),
    borough: String(formData.get('borough') ?? ''),
    engagementType: String(formData.get('engagementType') ?? 'worker'),
    hourlyRate: formData.get('hourlyRate'),
    bio: String(formData.get('bio') ?? '').trim() || undefined,
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

  const application = await prisma.companionApplication.findUnique({
    where: { id: d.applicationId },
  });
  if (!application) {
    return { ok: false, errors: { _form: 'Application not found.' } };
  }
  if (application.status !== 'vetting') {
    return {
      ok: false,
      errors: {
        _form: `Applications must be in 'vetting' before approval. Current status: ${application.status}.`,
      },
    };
  }

  // Transactional: upsert User, create Companion, move application to complete.
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: application.email },
      update: {
        firstName: application.firstName,
        lastName: application.lastName,
        role: 'companion',
      },
      create: {
        email: application.email,
        firstName: application.firstName,
        lastName: application.lastName,
        name: `${application.firstName} ${application.lastName}`,
        role: 'companion',
      },
    });

    const companion = await tx.companion.create({
      data: {
        userId: user.id,
        applicationId: application.id,
        firstName: application.firstName,
        lastName: application.lastName,
        borough: d.borough as CompanionBorough,
        engagementType: d.engagementType as CompanionEngagementType,
        hourlyRate: d.hourlyRate,
        bio: d.bio ?? null,
      },
    });

    await tx.companionApplication.update({
      where: { id: application.id },
      data: { status: 'complete' },
    });

    return { user, companion };
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'Companion',
    targetId: result.companion.id,
    afterState: {
      userId: result.user.id,
      applicationId: application.id,
      status: result.companion.status,
      borough: result.companion.borough,
      engagementType: result.companion.engagementType,
      hourlyRate: result.companion.hourlyRate.toString(),
    },
    metadata: { event: 'companion_created', fromApplicationId: application.id },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'state_change',
    targetType: 'CompanionApplication',
    targetId: application.id,
    beforeState: { status: 'vetting' },
    afterState: { status: 'complete' },
    metadata: {
      event: 'application_status_change',
      companionId: result.companion.id,
    },
  });

  revalidatePath('/ops');
  revalidatePath('/ops/companions');
  revalidatePath(`/ops/companions/${application.id}`);

  redirect(`/ops/companions/${application.id}?welcomed=1`);
}
