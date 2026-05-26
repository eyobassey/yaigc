'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser, requireCompanion } from '@/lib/auth-helpers';
import {
  postVisitReportToFamilyHtml,
  postVisitReportToFamilyText,
  postVisitReportToFamilySubject,
} from '@/lib/email/post-visit-report';
import {
  savePhoto,
  deletePhotoFile,
  readPhotoBytes,
  MAX_PHOTOS_PER_REPORT,
  PhotoValidationError,
  type SavedPhoto,
} from '@/lib/visit-photo-storage';

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

  // Photos: zero or more. recipientConsentForPhotos is required when at
  // least one photo is attached - separate from the report-sharing
  // consent on the recipient (that one is about whether the family sees
  // anything; this one is about the recipient agreeing to photos of
  // themselves).
  const rawPhotos = formData.getAll('photos').filter((p): p is File => p instanceof File && p.size > 0);
  const photoConsent = formData.get('recipientConsentForPhotos') === 'on';
  if (rawPhotos.length > MAX_PHOTOS_PER_REPORT) {
    return {
      ok: false,
      errors: { photos: `Max ${MAX_PHOTOS_PER_REPORT} photos per report.` },
      values: raw,
    };
  }
  if (rawPhotos.length > 0 && !photoConsent) {
    return {
      ok: false,
      errors: {
        recipientConsentForPhotos:
          'Confirm the recipient consented to these photos being shared with the family.',
      },
      values: raw,
    };
  }

  const before = await prisma.visit.findUnique({
    where: { id: d.visitId },
    select: {
      state: true,
      companionId: true,
      familyId: true,
      subscriptionId: true,
      secondaryCompanionId: true,
      subscription: { select: { originatingMatchId: true } },
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

  // SDD Addendum §2.4: cover-introduction visits feed the
  // "Cover introductions due this week" dashboard via a counter on the
  // originating Match. We bump it inside the same transaction that
  // creates the report so the count and the report are consistent.
  const bumpCoverCount = Boolean(
    before.secondaryCompanionId && before.subscription.originatingMatchId,
  );

  // SDD Addendum §4: when the second post-visit report for a Match is
  // filed, auto-schedule the two-visit calibration review for 72 hours
  // later. Only fires once - the field is non-null after the first
  // schedule so subsequent reports do not reset it.
  const twoVisitReviewSchedule = await deriveTwoVisitReviewSchedule(
    before.subscription.originatingMatchId,
  );

  // Atomic: write the report + move the visit to reported + bump
  // coverIntroductionVisitsCompleted on the match if applicable +
  // stamp twoVisitReviewScheduledFor on the second report.
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
    if (bumpCoverCount && before.subscription.originatingMatchId) {
      await tx.match.update({
        where: { id: before.subscription.originatingMatchId },
        data: { coverIntroductionVisitsCompleted: { increment: 1 } },
      });
    }
    if (twoVisitReviewSchedule) {
      await tx.match.update({
        where: { id: twoVisitReviewSchedule.matchId },
        data: { twoVisitReviewScheduledFor: twoVisitReviewSchedule.scheduledFor },
      });
    }
    return r;
  });

  // Photos: written to disk first, then recorded in DB. If a write
  // fails we rollback by deleting any files already written. The DB
  // rows are inserted in a transaction.
  const savedFiles: SavedPhoto[] = [];
  try {
    for (const file of rawPhotos) {
      const saved = await savePhoto(report.id, file);
      savedFiles.push(saved);
    }
    if (savedFiles.length > 0) {
      await prisma.$transaction(
        savedFiles.map((s) =>
          prisma.postVisitReportPhoto.create({
            data: {
              postVisitReportId: report.id,
              filename: s.filename,
              contentType: s.contentType,
              sizeBytes: s.sizeBytes,
              recipientConsentConfirmed: true,
            },
          }),
        ),
      );
    }
  } catch (err) {
    // Cleanup on disk - the DB rows for the report itself stay, but
    // the partially-uploaded photos are removed. Operator can retry
    // upload via a future edit-report flow.
    for (const s of savedFiles) {
      await deletePhotoFile(report.id, s.filename);
    }
    if (err instanceof PhotoValidationError) {
      return { ok: false, errors: { photos: err.message }, values: raw };
    }
    console.error('[report] photo persistence failed', { reportId: report.id, err });
  }

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

  // O.7.5 hook: any non-empty thingsToFlag opens a SafeguardingCase.
  // Lazy import so the cyclic dep between report and safeguarding does
  // not break tree-shaking.
  if (d.thingsToFlag) {
    try {
      const { openCaseFromReport } = await import('@/lib/safeguarding');
      await openCaseFromReport(report.id);
    } catch (err) {
      console.error('[report] safeguarding hook failed', { reportId: report.id, err });
    }
  }

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
      photos: true,
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

  // Read photo bytes once + build the cid list. The HTML will reference
  // each photo via cid:photo-N which nodemailer wires to the attachment.
  const photoAttachments: { filename: string; content: Buffer; cid: string; contentType: string }[] = [];
  for (let i = 0; i < report.photos.length; i++) {
    const p = report.photos[i]!;
    try {
      const content = await readPhotoBytes(report.id, p.filename);
      photoAttachments.push({
        filename: p.filename,
        content,
        cid: `photo-${i + 1}`,
        contentType: p.contentType,
      });
    } catch (err) {
      console.error('[report] photo read failed', { reportId, filename: p.filename, err });
    }
  }

  const input = {
    scheduledStartAt: report.visit.scheduledStartAt,
    actualDurationMinutes: report.actualDurationMinutes,
    recipientFirstName: report.visit.recipient.firstName,
    recipientPreferredName: report.visit.recipient.preferredName,
    companionFirstName: report.visit.companion.firstName,
    whatHappened: report.whatHappened,
    howWereThey: report.howWereThey,
    howWereTheyNote: report.howWereTheyNote,
    photoCids: photoAttachments.map((a) => a.cid),
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
        attachments: photoAttachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          cid: a.cid,
          contentType: a.contentType,
        })),
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

// -------------------------------------------------------------------------
// COMPANION SELF-SUBMIT path. Mirrors submitPostVisitReport above but
// authenticates via requireCompanion + scope-checks the visit. The
// submittedByOperatorId column stays NULL so the report card on the
// operator/family side can read "submitted by the companion" rather
// than "submitted on behalf".
// -------------------------------------------------------------------------

export async function submitPostVisitReportByCompanion(
  _prev: SubmitReportState,
  formData: FormData,
): Promise<SubmitReportState> {
  const { user, companion } = await requireCompanion(
    `/companion/visits/${String(formData.get('visitId') ?? '')}/report`,
  );

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

  const rawPhotos = formData
    .getAll('photos')
    .filter((p): p is File => p instanceof File && p.size > 0);
  const photoConsent = formData.get('recipientConsentForPhotos') === 'on';
  if (rawPhotos.length > MAX_PHOTOS_PER_REPORT) {
    return {
      ok: false,
      errors: { photos: `Max ${MAX_PHOTOS_PER_REPORT} photos per report.` },
      values: raw,
    };
  }
  if (rawPhotos.length > 0 && !photoConsent) {
    return {
      ok: false,
      errors: {
        recipientConsentForPhotos:
          'Confirm the recipient consented to these photos being shared with the family.',
      },
      values: raw,
    };
  }

  // Scope: the visit must belong to this companion, must be 'completed',
  // and must not already have a report.
  const before = await prisma.visit.findUnique({
    where: { id: d.visitId },
    select: {
      state: true,
      companionId: true,
      familyId: true,
      subscriptionId: true,
      secondaryCompanionId: true,
      subscription: { select: { originatingMatchId: true } },
      report: { select: { id: true } },
    },
  });
  if (!before || before.companionId !== companion.id) {
    return { ok: false, errors: { _form: 'Visit not found.' }, values: raw };
  }
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

  // SDD Addendum §2.4 + §4: see operator-submission path for context.
  const bumpCoverCount = Boolean(
    before.secondaryCompanionId && before.subscription.originatingMatchId,
  );
  const twoVisitReviewSchedule = await deriveTwoVisitReviewSchedule(
    before.subscription.originatingMatchId,
  );

  const report = await prisma.$transaction(async (tx) => {
    const r = await tx.postVisitReport.create({
      data: {
        visitId: d.visitId,
        companionId: companion.id,
        actualDurationMinutes: d.actualDurationMinutes,
        whatHappened: d.whatHappened,
        howWereThey: d.howWereThey,
        howWereTheyNote: d.howWereTheyNote ?? null,
        thingsToFlag: d.thingsToFlag ?? null,
        // submittedByOperatorId stays NULL - this is self-submitted.
      },
    });
    await tx.visit.update({
      where: { id: d.visitId },
      data: { state: 'reported', stateChangedAt: new Date() },
    });
    if (bumpCoverCount && before.subscription.originatingMatchId) {
      await tx.match.update({
        where: { id: before.subscription.originatingMatchId },
        data: { coverIntroductionVisitsCompleted: { increment: 1 } },
      });
    }
    if (twoVisitReviewSchedule) {
      await tx.match.update({
        where: { id: twoVisitReviewSchedule.matchId },
        data: { twoVisitReviewScheduledFor: twoVisitReviewSchedule.scheduledFor },
      });
    }
    return r;
  });

  const savedFiles: SavedPhoto[] = [];
  try {
    for (const file of rawPhotos) {
      const saved = await savePhoto(report.id, file);
      savedFiles.push(saved);
    }
    if (savedFiles.length > 0) {
      await prisma.$transaction(
        savedFiles.map((s) =>
          prisma.postVisitReportPhoto.create({
            data: {
              postVisitReportId: report.id,
              filename: s.filename,
              contentType: s.contentType,
              sizeBytes: s.sizeBytes,
              recipientConsentConfirmed: true,
            },
          }),
        ),
      );
    }
  } catch (err) {
    for (const s of savedFiles) {
      await deletePhotoFile(report.id, s.filename);
    }
    if (err instanceof PhotoValidationError) {
      return { ok: false, errors: { photos: err.message }, values: raw };
    }
    console.error('[report] companion photo persistence failed', {
      reportId: report.id,
      err,
    });
  }

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
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
      via: 'companion_portal',
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

  if (d.thingsToFlag) {
    try {
      const { openCaseFromReport } = await import('@/lib/safeguarding');
      await openCaseFromReport(report.id);
    } catch (err) {
      console.error('[report] safeguarding hook failed', { reportId: report.id, err });
    }
  }

  revalidatePath('/companion');
  revalidatePath('/companion/visits');
  revalidatePath(`/companion/visits/${d.visitId}`);
  revalidatePath('/ops');
  revalidatePath('/ops/visits');
  revalidatePath(`/ops/visits/${d.visitId}`);
  revalidatePath(`/ops/subscriptions/${before.subscriptionId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
  redirect(`/companion/visits/${d.visitId}`);
}

// SDD Addendum §4. When the second post-visit report for a Match is
// filed, the operator team gets 72 hours to conduct the two-visit
// calibration review. Returns { matchId, scheduledFor } if the
// current report is the second AND no review has yet been scheduled;
// otherwise null. Phase-1 scale - concurrent submissions on the same
// match are not a realistic risk; the field is gated by an
// "already-null" check so a race would simply double-write the same
// timestamp.
const TWO_VISIT_REVIEW_WINDOW_HOURS = 72;

async function deriveTwoVisitReviewSchedule(
  matchId: string | null,
): Promise<{ matchId: string; scheduledFor: Date } | null> {
  if (!matchId) return null;
  const [existingCount, match] = await Promise.all([
    prisma.postVisitReport.count({
      where: { visit: { subscription: { originatingMatchId: matchId } } },
    }),
    prisma.match.findUnique({
      where: { id: matchId },
      select: { twoVisitReviewScheduledFor: true },
    }),
  ]);
  if (!match || match.twoVisitReviewScheduledFor !== null) return null;
  // existingCount is the number of reports BEFORE this transaction
  // writes its own. The current report will be the (existingCount + 1)th.
  // We trigger on the second report.
  if (existingCount !== 1) return null;
  const scheduledFor = new Date(
    Date.now() + TWO_VISIT_REVIEW_WINDOW_HOURS * 60 * 60 * 1000,
  );
  return { matchId, scheduledFor };
}

