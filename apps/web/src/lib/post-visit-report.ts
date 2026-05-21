'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';
import {
  postVisitReportToFamilyHtml,
  postVisitReportToFamilyText,
  postVisitReportToFamilySubject,
} from '@/lib/email/post-visit-report';

const WELLBEING_VALUES = [
  'cheerful',
  'quiet',
  'tired',
  'unwell',
  'distressed',
  'other',
] as const;

const SubmitSchema = z
  .object({
    visitId: z.string().min(1),
    actualDurationMinutes: z.coerce.number().int().min(5).max(720),
    whatHappened: z
      .string()
      .min(20, 'Tell us a little about how the visit went.')
      .max(4000),
    howWereThey: z.enum(WELLBEING_VALUES),
    howWereTheyNote: z.string().max(2000).optional(),
    thingsToFlag: z.string().max(4000).optional(),
  })
  .refine(
    (d) => d.howWereThey !== 'other' || (d.howWereTheyNote && d.howWereTheyNote.length >= 5),
    {
      message: 'A note is required when wellbeing is "other".',
      path: ['howWereTheyNote'],
    },
  );

export type SubmitReportState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function submitPostVisitReport(
  _prev: SubmitReportState,
  formData: FormData,
): Promise<SubmitReportState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    visitId: String(formData.get('visitId') ?? ''),
    actualDurationMinutes: String(formData.get('actualDurationMinutes') ?? ''),
    whatHappened: String(formData.get('whatHappened') ?? '').trim(),
    howWereThey: String(formData.get('howWereThey') ?? ''),
    howWereTheyNote: String(formData.get('howWereTheyNote') ?? '').trim() || undefined,
    thingsToFlag: String(formData.get('thingsToFlag') ?? '').trim() || undefined,
  };

  const parsed = SubmitSchema.safeParse(raw);
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

  const before = await prisma.visit.findUnique({
    where: { id: d.visitId },
    select: {
      state: true,
      companionId: true,
      familyId: true,
      subscriptionId: true,
      report: { select: { id: true } },
    },
  });
  if (!before) return { ok: false, errors: { _form: 'Visit not found.' }, values: raw };
  if (before.state !== 'completed') {
    return {
      ok: false,
      errors: { _form: 'Only completed visits accept a report.' },
      values: raw,
    };
  }
  if (before.report) {
    return {
      ok: false,
      errors: { _form: 'This visit already has a report.' },
      values: raw,
    };
  }

  // Atomic: write the report + move the visit to reported.
  const report = await prisma.$transaction(async (tx) => {
    const r = await tx.postVisitReport.create({
      data: {
        visitId: d.visitId,
        companionId: before.companionId,
        actualDurationMinutes: d.actualDurationMinutes,
        whatHappened: d.whatHappened,
        howWereThey: d.howWereThey,
        howWereTheyNote: d.howWereTheyNote ?? null,
        thingsToFlag: d.thingsToFlag ?? null,
        submittedByOperatorId: operator.id,
      },
    });
    await tx.visit.update({
      where: { id: d.visitId },
      data: { state: 'reported', stateChangedAt: new Date() },
    });
    return r;
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'PostVisitReport',
    targetId: report.id,
    afterState: {
      visitId: d.visitId,
      howWereThey: d.howWereThey,
      actualDurationMinutes: d.actualDurationMinutes,
      hasThingsToFlag: Boolean(d.thingsToFlag),
    },
    metadata: {
      event: 'post_visit_report_submitted',
      // Hook for Stage O.7.5: any non-empty thingsToFlag spins up a
      // SafeguardingCase. For now we just flag the audit entry.
      ...(d.thingsToFlag ? { safeguardingHook: true } : {}),
    },
  });

  await audit({
    actorType: 'system',
    actorId: null,
    actionType: 'state_change',
    targetType: 'Visit',
    targetId: d.visitId,
    beforeState: { state: 'completed' },
    afterState: { state: 'reported' },
    metadata: { event: 'visit_state_change', via: 'report_submission' },
  });

  await sendFamilySummaryEmail(report.id);

  revalidatePath('/ops');
  revalidatePath('/ops/visits');
  revalidatePath(`/ops/visits/${d.visitId}`);
  revalidatePath(`/ops/subscriptions/${before.subscriptionId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
  redirect(`/ops/visits/${d.visitId}`);
}

async function sendFamilySummaryEmail(reportId: string): Promise<void> {
  const report = await prisma.postVisitReport.findUnique({
    where: { id: reportId },
    include: {
      visit: {
        include: {
          family: {
            select: {
              id: true,
              members: {
                where: { deletedAt: null },
                include: { user: { select: { email: true } } },
              },
            },
          },
          recipient: {
            select: {
              firstName: true,
              preferredName: true,
              consentToReportSharing: true,
            },
          },
          companion: { select: { firstName: true } },
        },
      },
    },
  });
  if (!report) return;

  if (!report.visit.recipient.consentToReportSharing) {
    await audit({
      actorType: 'system',
      actorId: null,
      actionType: 'state_change',
      targetType: 'PostVisitReport',
      targetId: report.id,
      metadata: {
        event: 'post_visit_report_email_skipped_no_consent',
        recipientId: report.visit.recipientId,
      },
    });
    return;
  }

  const transport = createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

  const input = {
    scheduledStartAt: report.visit.scheduledStartAt,
    actualDurationMinutes: report.actualDurationMinutes,
    recipientFirstName: report.visit.recipient.firstName,
    recipientPreferredName: report.visit.recipient.preferredName,
    companionFirstName: report.visit.companion.firstName,
    whatHappened: report.whatHappened,
    howWereThey: report.howWereThey,
    howWereTheyNote: report.howWereTheyNote,
  };

  const familyEmails = Array.from(
    new Set(
      report.visit.family.members
        .map((m) => m.user.email)
        .filter((e): e is string => Boolean(e)),
    ),
  );

  let anyDelivered = false;
  for (const to of familyEmails) {
    try {
      await transport.sendMail({
        to,
        from,
        subject: postVisitReportToFamilySubject(input),
        text: postVisitReportToFamilyText(input),
        html: postVisitReportToFamilyHtml(input),
      });
      anyDelivered = true;
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'PostVisitReport',
        targetId: report.id,
        metadata: { event: 'post_visit_report_family_email_sent', to },
      });
    } catch (err) {
      console.error('[report] family summary email failed', { to, reportId, err });
    }
  }

  if (anyDelivered) {
    await prisma.postVisitReport.update({
      where: { id: report.id },
      data: { deliveredToFamilyAt: new Date() },
    });
  }
}
