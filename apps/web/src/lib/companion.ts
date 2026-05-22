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
import {
  parseAvailabilityFormData,
  summariseAvailability,
  hasAnyAvailability,
} from '@/lib/availability';

// -------------------------------------------------------------------------
// PUBLIC: submit a companion application
// -------------------------------------------------------------------------

const RIGHT_TO_WORK_TYPES = [
  'british_irish_passport',
  'settled_status',
  'pre_settled_status',
  'skilled_worker_visa',
  'graduate_visa',
  'student_visa',
  'dependant_visa',
  'indefinite_leave_to_remain',
  'other',
] as const;

const ApplicationSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').max(80),
  lastName: z.string().min(1, 'Last name is required.').max(80),
  email: z.string().email('Enter a valid email address.').max(160),
  phone: z.string().min(7, 'Enter a phone number.').max(40),
  postcode: z.string().min(2, 'Enter a postcode.').max(20),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
    .refine(
      (s) => {
        const d = new Date(`${s}T00:00:00.000Z`);
        const now = new Date();
        const age = now.getUTCFullYear() - d.getUTCFullYear();
        return age >= 18 && age <= 100;
      },
      { message: 'You must be 18 or over.' },
    ),
  whyJoinReason: z.string().min(20, 'A few sentences please.').max(4000),
  aboutYou: z.string().min(20, 'A few sentences please.').max(4000),
  rightToWork: z
    .union([z.literal('on'), z.literal('off')])
    .refine((v) => v === 'on', {
      message: 'You must confirm right to work in the UK.',
    }),
  rightToWorkType: z.enum(RIGHT_TO_WORK_TYPES),
  rightToWorkShareCode: z.string().trim().max(20).optional(),
  rightToWorkExpiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
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

/**
 * Map a self-declared RightToWorkType to the most-likely document kind.
 * Used to label the upload attachment without making the applicant
 * pick a kind from yet another dropdown.
 */
function inferDocumentKind(type: string):
  | 'passport'
  | 'brp'
  | 'share_code_pdf'
  | 'visa_letter'
  | 'ilr_document'
  | 'other' {
  if (type === 'british_irish_passport') return 'passport';
  if (type === 'settled_status' || type === 'pre_settled_status') return 'share_code_pdf';
  if (
    type === 'skilled_worker_visa' ||
    type === 'graduate_visa' ||
    type === 'student_visa' ||
    type === 'dependant_visa'
  ) {
    return 'share_code_pdf';
  }
  if (type === 'indefinite_leave_to_remain') return 'ilr_document';
  return 'other';
}

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
    dateOfBirth: get('dateOfBirth'),
    whyJoinReason: get('whyJoinReason'),
    aboutYou: get('aboutYou'),
    rightToWork: (formData.get('rightToWork') as string) || 'off',
    rightToWorkType: get('rightToWorkType'),
    rightToWorkShareCode: get('rightToWorkShareCode') || undefined,
    rightToWorkExpiresAt: get('rightToWorkExpiresAt') || undefined,
    backgroundCheckConsent:
      (formData.get('backgroundCheckConsent') as string) || 'off',
  };

  // Parse the picker checkboxes into structured slots, then derive an
  // operator-readable summary.
  const slots = parseAvailabilityFormData(formData);
  const parsed = ApplicationSchema.safeParse(raw);
  const availabilityOk = hasAnyAvailability(slots);

  if (!parsed.success || !availabilityOk) {
    const errors: Record<string, string> = {};
    if (!parsed.success) {
      for (const i of parsed.error.issues) {
        const k = i.path[0];
        if (typeof k === 'string' && !(k in errors)) errors[k] = i.message;
      }
    }
    if (!availabilityOk) {
      errors.availability = 'Pick at least one time slot.';
    }
    return {
      ok: false,
      errors,
      values: { ...raw, availabilityCaveats: slots.caveats ?? '' } as Record<
        string,
        string
      >,
    };
  }
  const d = parsed.data;

  const availabilitySummary = summariseAvailability(slots);

  const application = await prisma.companionApplication.create({
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      postcode: d.postcode,
      dateOfBirth: new Date(`${d.dateOfBirth}T00:00:00.000Z`),
      availabilitySummary,
      availabilitySlots: slots,
      whyJoinReason: d.whyJoinReason,
      aboutYou: d.aboutYou,
      rightToWork: true,
      rightToWorkType: d.rightToWorkType,
      rightToWorkShareCode: d.rightToWorkShareCode ?? null,
      rightToWorkExpiresAt: d.rightToWorkExpiresAt
        ? new Date(`${d.rightToWorkExpiresAt}T00:00:00.000Z`)
        : null,
      backgroundCheckConsent: true,
    },
  });

  // Optional document uploads from the apply form. Best-effort: a save
  // failure does not unwind the application itself; operator will see
  // the gap on /ops/companions/[id] and follow up.
  const rawFiles = formData
    .getAll('rightToWorkDocs')
    .filter((p): p is File => p instanceof File && p.size > 0);
  if (rawFiles.length > 0) {
    try {
      const { saveDocument, MAX_DOCS_PER_APPLICATION } = await import(
        '@/lib/companion-document-storage'
      );
      const inferredKind = inferDocumentKind(d.rightToWorkType);
      const limited = rawFiles.slice(0, MAX_DOCS_PER_APPLICATION);
      for (const file of limited) {
        const saved = await saveDocument(application.id, file);
        await prisma.companionDocument.create({
          data: {
            companionApplicationId: application.id,
            kind: inferredKind,
            filename: saved.filename,
            contentType: saved.contentType,
            sizeBytes: saved.sizeBytes,
            uploadedByActorType: 'user',
            uploadedByActorId: null,
          },
        });
      }
      await audit({
        actorType: 'user',
        actorId: null,
        actionType: 'create',
        targetType: 'CompanionApplication',
        targetId: application.id,
        metadata: {
          event: 'right_to_work_documents_uploaded',
          count: limited.length,
          kind: inferredKind,
        },
      });
    } catch (err) {
      console.error('[companion] RTW doc upload failed', {
        applicationId: application.id,
        err,
      });
    }
  }

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

// -------------------------------------------------------------------------
// OPERATOR: verify right-to-work after running the gov.uk online check
// -------------------------------------------------------------------------

const VerifyRightToWorkSchema = z.object({
  applicationId: z.string().min(1),
  note: z.string().min(5, 'Add a short note (gov.uk check ref, etc).').max(2000),
});

export type VerifyRightToWorkState = {
  ok: boolean;
  errors?: Record<string, string>;
};

export async function verifyRightToWork(
  _prev: VerifyRightToWorkState,
  formData: FormData,
): Promise<VerifyRightToWorkState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const parsed = VerifyRightToWorkSchema.safeParse({
    applicationId: String(formData.get('applicationId') ?? ''),
    note: String(formData.get('note') ?? '').trim(),
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

  const before = await prisma.companionApplication.findUnique({
    where: { id: d.applicationId },
    select: { rightToWorkVerifiedAt: true },
  });
  if (!before) return { ok: false, errors: { _form: 'Application not found.' } };

  await prisma.companionApplication.update({
    where: { id: d.applicationId },
    data: {
      rightToWorkVerifiedAt: new Date(),
      rightToWorkVerifiedByOperatorId: operator.id,
      rightToWorkVerificationNote: d.note,
    },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'update',
    targetType: 'CompanionApplication',
    targetId: d.applicationId,
    metadata: { event: 'right_to_work_verified', previousVerifiedAt: before.rightToWorkVerifiedAt },
  });

  revalidatePath('/ops/companions');
  revalidatePath(`/ops/companions/${d.applicationId}`);
  return { ok: true };
}

// -------------------------------------------------------------------------
// COMPANION + OPERATOR: upload a CompanionDocument
// -------------------------------------------------------------------------

const DOCUMENT_KINDS = [
  'passport',
  'brp',
  'share_code_pdf',
  'visa_letter',
  'ilr_document',
  'dbs_certificate',
  'other',
] as const;

const UploadDocumentSchema = z.object({
  applicationId: z.string().min(1),
  kind: z.enum(DOCUMENT_KINDS),
  description: z.string().trim().max(500).optional(),
});

export type UploadDocumentState = {
  ok: boolean;
  errors?: Record<string, string>;
};

export async function uploadCompanionDocument(
  _prev: UploadDocumentState,
  formData: FormData,
): Promise<UploadDocumentState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, errors: { _form: 'Not signed in.' } };

  const parsed = UploadDocumentSchema.safeParse({
    applicationId: String(formData.get('applicationId') ?? ''),
    kind: String(formData.get('kind') ?? ''),
    description: String(formData.get('description') ?? '').trim() || undefined,
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

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: { file: 'Pick a file to upload.' } };
  }

  // Scope check: operator OR the companion whose application this is.
  const app = await prisma.companionApplication.findUnique({
    where: { id: d.applicationId },
    select: { id: true, companion: { select: { userId: true } } },
  });
  if (!app) return { ok: false, errors: { _form: 'Application not found.' } };

  const isOp = user.role.startsWith('operator_');
  const isOwner = app.companion?.userId === user.id;
  if (!isOp && !isOwner) return { ok: false, errors: { _form: 'Not authorised.' } };

  let saved;
  try {
    const { saveDocument, DocumentValidationError } = await import(
      '@/lib/companion-document-storage'
    );
    try {
      saved = await saveDocument(d.applicationId, file);
    } catch (err) {
      if (err instanceof DocumentValidationError) {
        return { ok: false, errors: { file: err.message } };
      }
      throw err;
    }
  } catch (err) {
    console.error('[companion-doc] upload failed', { applicationId: d.applicationId, err });
    return { ok: false, errors: { _form: 'Upload failed. Try again.' } };
  }

  const doc = await prisma.companionDocument.create({
    data: {
      companionApplicationId: d.applicationId,
      kind: d.kind,
      filename: saved.filename,
      contentType: saved.contentType,
      sizeBytes: saved.sizeBytes,
      description: d.description ?? null,
      uploadedByActorType: 'user',
      uploadedByActorId: user.id,
    },
  });

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'create',
    targetType: 'CompanionDocument',
    targetId: doc.id,
    metadata: { event: 'companion_document_uploaded', kind: d.kind, applicationId: d.applicationId },
  });

  revalidatePath(`/ops/companions/${d.applicationId}`);
  revalidatePath('/companion/documents');
  return { ok: true };
}

// -------------------------------------------------------------------------
// OPERATOR: archive a CompanionDocument (soft delete, audit-trail safe)
// -------------------------------------------------------------------------

export async function archiveCompanionDocument(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator || !operator.role.startsWith('operator_')) return;

  const docId = String(formData.get('documentId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim() || null;
  if (!docId) return;

  const before = await prisma.companionDocument.findUnique({
    where: { id: docId },
    select: { archivedAt: true, companionApplicationId: true },
  });
  if (!before || before.archivedAt) return;

  await prisma.companionDocument.update({
    where: { id: docId },
    data: {
      archivedAt: new Date(),
      archivedByOperatorId: operator.id,
      archivedReason: reason,
    },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'delete',
    targetType: 'CompanionDocument',
    targetId: docId,
    metadata: { event: 'companion_document_archived', reason },
  });

  revalidatePath(`/ops/companions/${before.companionApplicationId}`);
  revalidatePath('/companion/documents');
}
