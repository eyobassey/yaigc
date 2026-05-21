'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import type { Prisma, SafeguardingSeverity } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';
import {
  safeguardingCaseOpenedHtml,
  safeguardingCaseOpenedText,
  safeguardingCaseOpenedSubject,
} from '@/lib/email/safeguarding-case-opened';

// -------------------------------------------------------------------------
// AUTO-OPEN HOOKS
//
// Called from other server actions (post-visit-report submit, match end)
// when their safeguarding metadata flag fires. Both are idempotent via the
// @unique constraint on relatedReportId / relatedMatchId so retries do not
// double-open.
// -------------------------------------------------------------------------

const SUMMARY_MAX = 1000;

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 3).trimEnd() + '...';
}

export async function openCaseFromReport(reportId: string): Promise<string | null> {
  const report = await prisma.postVisitReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      thingsToFlag: true,
      submittedByOperatorId: true,
      submittedBy: { select: { firstName: true, lastName: true, email: true } },
      visit: {
        select: {
          id: true,
          recipientId: true,
          recipient: { select: { firstName: true, lastName: true, preferredName: true } },
        },
      },
    },
  });
  if (!report || !report.thingsToFlag) return null;

  const existing = await prisma.safeguardingCase.findUnique({
    where: { relatedReportId: report.id },
    select: { id: true },
  });
  if (existing) return existing.id;

  const c = await prisma.safeguardingCase.create({
    data: {
      severity: 'medium',
      summary: truncate(
        `Companion flagged: ${report.thingsToFlag}`,
        SUMMARY_MAX,
      ),
      subjectRecipientId: report.visit.recipientId,
      relatedVisitId: report.visit.id,
      relatedReportId: report.id,
      openedByOperatorId: report.submittedByOperatorId,
    },
  });

  await audit({
    actorType: 'system',
    actorId: null,
    actionType: 'create',
    targetType: 'SafeguardingCase',
    targetId: c.id,
    afterState: {
      severity: c.severity,
      status: c.status,
      subjectRecipientId: c.subjectRecipientId,
      relatedReportId: c.relatedReportId,
    },
    metadata: { event: 'safeguarding_case_opened', trigger: 'pvr_things_to_flag' },
  });

  await notifyAdminsCaseOpened(c.id, 'pvr_things_to_flag');
  revalidatePath('/ops');
  revalidatePath('/ops/safeguarding');
  return c.id;
}

export async function openCaseFromMatchEnd(matchId: string): Promise<string | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      endReason: true,
      endNote: true,
      endedByOperatorId: true,
      recipientId: true,
      recipient: { select: { firstName: true, lastName: true, preferredName: true } },
    },
  });
  if (!match || match.endReason !== 'safeguarding_concern') return null;

  const existing = await prisma.safeguardingCase.findUnique({
    where: { relatedMatchId: match.id },
    select: { id: true },
  });
  if (existing) return existing.id;

  const c = await prisma.safeguardingCase.create({
    data: {
      severity: 'high',
      summary: truncate(
        `Match ended with safeguarding concern.${match.endNote ? ` Internal note: ${match.endNote}` : ''}`,
        SUMMARY_MAX,
      ),
      subjectRecipientId: match.recipientId,
      relatedMatchId: match.id,
      openedByOperatorId: match.endedByOperatorId,
    },
  });

  await audit({
    actorType: 'system',
    actorId: null,
    actionType: 'create',
    targetType: 'SafeguardingCase',
    targetId: c.id,
    afterState: {
      severity: c.severity,
      status: c.status,
      subjectRecipientId: c.subjectRecipientId,
      relatedMatchId: c.relatedMatchId,
    },
    metadata: { event: 'safeguarding_case_opened', trigger: 'match_ended_safeguarding' },
  });

  await notifyAdminsCaseOpened(c.id, 'match_ended_safeguarding');
  revalidatePath('/ops');
  revalidatePath('/ops/safeguarding');
  return c.id;
}

// -------------------------------------------------------------------------
// MANUAL OPEN
// -------------------------------------------------------------------------

const OpenSchema = z.object({
  subjectRecipientId: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  summary: z.string().min(20, 'Tell us what is going on. A few sentences please.').max(2000),
});

export type OpenCaseState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function openCaseManually(
  _prev: OpenCaseState,
  formData: FormData,
): Promise<OpenCaseState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    subjectRecipientId: String(formData.get('subjectRecipientId') ?? '').trim() || undefined,
    severity: String(formData.get('severity') ?? ''),
    summary: String(formData.get('summary') ?? '').trim(),
  };

  const parsed = OpenSchema.safeParse(raw);
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

  const c = await prisma.safeguardingCase.create({
    data: {
      severity: d.severity,
      summary: d.summary,
      subjectRecipientId: d.subjectRecipientId || null,
      openedByOperatorId: operator.id,
    },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'SafeguardingCase',
    targetId: c.id,
    afterState: { severity: c.severity, status: c.status, subjectRecipientId: c.subjectRecipientId },
    metadata: { event: 'safeguarding_case_opened', trigger: 'manual' },
  });

  await notifyAdminsCaseOpened(c.id, 'manual');

  revalidatePath('/ops');
  revalidatePath('/ops/safeguarding');
  redirect(`/ops/safeguarding/${c.id}`);
}

// -------------------------------------------------------------------------
// TRANSITION + ASSIGN + SEVERITY + ADD NOTE
// -------------------------------------------------------------------------

const ALLOWED_NEXT: Record<string, string[]> = {
  open: ['under_review', 'actioned', 'closed'],
  under_review: ['actioned', 'closed', 'open'],
  actioned: ['closed', 'under_review'],
  closed: ['open'], // reopen
};

const TransitionSchema = z.object({
  caseId: z.string().min(1),
  to: z.enum(['open', 'under_review', 'actioned', 'closed']),
});

export async function transitionCase(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;
  const parsed = TransitionSchema.safeParse({
    caseId: String(formData.get('caseId') ?? ''),
    to: String(formData.get('to') ?? ''),
  });
  if (!parsed.success) return;
  const d = parsed.data;

  const before = await prisma.safeguardingCase.findUnique({
    where: { id: d.caseId },
    select: { status: true },
  });
  if (!before) return;
  if (!ALLOWED_NEXT[before.status]?.includes(d.to)) return;
  // Closure goes through closeCase below; this action does not handle it.
  if (d.to === 'closed') return;

  const data: Prisma.SafeguardingCaseUncheckedUpdateInput = { status: d.to };
  if (before.status === 'closed' && d.to === 'open') {
    data.closedAt = null;
    data.closedByOperatorId = null;
    data.closureCategory = null;
    data.closureNote = null;
  }

  await prisma.safeguardingCase.update({ where: { id: d.caseId }, data });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'state_change',
    targetType: 'SafeguardingCase',
    targetId: d.caseId,
    beforeState: { status: before.status },
    afterState: { status: d.to },
    metadata: { event: 'safeguarding_case_status_change' },
  });

  revalidatePath('/ops');
  revalidatePath('/ops/safeguarding');
  revalidatePath(`/ops/safeguarding/${d.caseId}`);
}

const AssignSchema = z.object({
  caseId: z.string().min(1),
  assignedToOperatorId: z.string().optional(),
});

export async function assignCase(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;
  const parsed = AssignSchema.safeParse({
    caseId: String(formData.get('caseId') ?? ''),
    assignedToOperatorId: String(formData.get('assignedToOperatorId') ?? '').trim() || undefined,
  });
  if (!parsed.success) return;
  const d = parsed.data;

  const before = await prisma.safeguardingCase.findUnique({
    where: { id: d.caseId },
    select: { assignedToOperatorId: true },
  });
  if (!before) return;
  const nextAssignee = d.assignedToOperatorId === 'me' ? operator.id : d.assignedToOperatorId ?? null;

  await prisma.safeguardingCase.update({
    where: { id: d.caseId },
    data: { assignedToOperatorId: nextAssignee },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'update',
    targetType: 'SafeguardingCase',
    targetId: d.caseId,
    beforeState: { assignedToOperatorId: before.assignedToOperatorId },
    afterState: { assignedToOperatorId: nextAssignee },
    metadata: { event: 'safeguarding_case_assigned' },
  });

  revalidatePath('/ops/safeguarding');
  revalidatePath(`/ops/safeguarding/${d.caseId}`);
}

const SeveritySchema = z.object({
  caseId: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

export async function updateCaseSeverity(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;
  const parsed = SeveritySchema.safeParse({
    caseId: String(formData.get('caseId') ?? ''),
    severity: String(formData.get('severity') ?? ''),
  });
  if (!parsed.success) return;
  const d = parsed.data;

  const before = await prisma.safeguardingCase.findUnique({
    where: { id: d.caseId },
    select: { severity: true },
  });
  if (!before || before.severity === d.severity) return;

  await prisma.safeguardingCase.update({
    where: { id: d.caseId },
    data: { severity: d.severity as SafeguardingSeverity },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'update',
    targetType: 'SafeguardingCase',
    targetId: d.caseId,
    beforeState: { severity: before.severity },
    afterState: { severity: d.severity },
    metadata: { event: 'safeguarding_case_severity_change' },
  });

  revalidatePath('/ops/safeguarding');
  revalidatePath(`/ops/safeguarding/${d.caseId}`);
}

const NoteSchema = z.object({
  caseId: z.string().min(1),
  body: z.string().min(2).max(4000),
});

export async function addCaseNote(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;
  const parsed = NoteSchema.safeParse({
    caseId: String(formData.get('caseId') ?? ''),
    body: String(formData.get('body') ?? '').trim(),
  });
  if (!parsed.success) return;
  const d = parsed.data;

  const note = await prisma.safeguardingCaseNote.create({
    data: { caseId: d.caseId, authorOperatorId: operator.id, body: d.body },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'SafeguardingCaseNote',
    targetId: note.id,
    afterState: { caseId: d.caseId },
    metadata: { event: 'safeguarding_case_note_added' },
  });

  revalidatePath(`/ops/safeguarding/${d.caseId}`);
}

// -------------------------------------------------------------------------
// CLOSE
// -------------------------------------------------------------------------

const CloseSchema = z.object({
  caseId: z.string().min(1),
  closureCategory: z.enum([
    'no_action_needed',
    'followed_up_with_family',
    'followed_up_with_companion',
    'companion_removed',
    'external_referral',
    'other',
  ]),
  closureNote: z.string().min(20, 'A closure note is required.').max(4000),
});

export type CloseCaseState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function closeCase(
  _prev: CloseCaseState,
  formData: FormData,
): Promise<CloseCaseState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    caseId: String(formData.get('caseId') ?? ''),
    closureCategory: String(formData.get('closureCategory') ?? ''),
    closureNote: String(formData.get('closureNote') ?? '').trim(),
  };

  const parsed = CloseSchema.safeParse(raw);
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

  const before = await prisma.safeguardingCase.findUnique({
    where: { id: d.caseId },
    select: { status: true },
  });
  if (!before || before.status === 'closed') {
    return { ok: false, errors: { _form: 'Case is already closed.' }, values: raw };
  }

  await prisma.safeguardingCase.update({
    where: { id: d.caseId },
    data: {
      status: 'closed',
      closedAt: new Date(),
      closedByOperatorId: operator.id,
      closureCategory: d.closureCategory,
      closureNote: d.closureNote,
    },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'state_change',
    targetType: 'SafeguardingCase',
    targetId: d.caseId,
    beforeState: { status: before.status },
    afterState: { status: 'closed', closureCategory: d.closureCategory },
    metadata: { event: 'safeguarding_case_closed' },
  });

  revalidatePath('/ops');
  revalidatePath('/ops/safeguarding');
  revalidatePath(`/ops/safeguarding/${d.caseId}`);
  redirect(`/ops/safeguarding/${d.caseId}`);
}

// -------------------------------------------------------------------------
// EMAIL: operator_admin users on case open
// -------------------------------------------------------------------------

async function notifyAdminsCaseOpened(caseId: string, trigger: string): Promise<void> {
  const c = await prisma.safeguardingCase.findUnique({
    where: { id: caseId },
    include: {
      subjectRecipient: { select: { firstName: true, lastName: true, preferredName: true } },
      openedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!c) return;

  const admins = await prisma.user.findMany({
    where: { role: 'operator_admin', deletedAt: null },
    select: { email: true },
  });
  if (admins.length === 0) return;

  const transport = createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

  const subjectRecipientName = c.subjectRecipient
    ? c.subjectRecipient.preferredName
      ? `${c.subjectRecipient.firstName} ${c.subjectRecipient.lastName} (known as ${c.subjectRecipient.preferredName})`
      : `${c.subjectRecipient.firstName} ${c.subjectRecipient.lastName}`
    : null;
  const openedByLabel = c.openedBy
    ? `${c.openedBy.firstName ?? ''} ${c.openedBy.lastName ?? ''}`.trim() || c.openedBy.email
    : 'System (auto-opened)';

  const input = {
    caseId: c.id,
    severity: c.severity,
    trigger,
    summary: c.summary,
    subjectRecipientName,
    openedByLabel,
  };

  for (const a of admins) {
    if (!a.email) continue;
    try {
      await transport.sendMail({
        to: a.email,
        from,
        subject: safeguardingCaseOpenedSubject(input),
        text: safeguardingCaseOpenedText(input),
        html: safeguardingCaseOpenedHtml(input),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'SafeguardingCase',
        targetId: caseId,
        metadata: { event: 'safeguarding_case_admin_email_sent', to: a.email },
      });
    } catch (err) {
      console.error('[safeguarding] admin notification failed', { to: a.email, caseId, err });
    }
  }
}
