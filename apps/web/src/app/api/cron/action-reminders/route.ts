import { NextResponse } from 'next/server';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import {
  matchReminderToFamilyHtml,
  matchReminderToFamilyText,
  matchReminderToFamilySubject,
  matchReminderToCompanionHtml,
  matchReminderToCompanionText,
  matchReminderToCompanionSubject,
  visitConfirmationReminderHtml,
  visitConfirmationReminderText,
  visitConfirmationReminderSubject,
  reportOverdueReminderHtml,
  reportOverdueReminderText,
  reportOverdueReminderSubject,
} from '@/lib/email/action-reminders';

// Hourly cron endpoint. Token-gated like /api/cron/visit-reminders.
// Each reminder type is single-fire via its *ReminderSentAt column;
// once set, subsequent runs skip the subject.
//
// Cadence per type:
//   - Match family reminder:    24h after createdAt, status=proposed,
//                                familyResponseAt null, familyReminderSentAt null
//   - Match companion reminder: 24h after createdAt, status=proposed,
//                                companionResponseAt null, companionReminderSentAt null
//   - Visit confirmation:        scheduledStartAt within next 4h,
//                                state=scheduled, confirmationReminderSentAt null
//   - Report overdue:            stateChangedAt >4h ago, state=completed,
//                                no report, reportReminderSentAt null

const HOUR_MS = 60 * 60 * 1000;

function unauthorized() {
  return new NextResponse('Unauthorized', { status: 401 });
}

function buildTransport() {
  return createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
}

export async function POST(req: Request) {
  const expected = process.env.CRON_TOKEN;
  if (!expected) {
    console.error('[cron] CRON_TOKEN not configured');
    return new NextResponse('Misconfigured', { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${expected}`) return unauthorized();

  const now = new Date();
  const matchCutoff = new Date(now.getTime() - 24 * HOUR_MS);
  const confirmationWindowEnd = new Date(now.getTime() + 4 * HOUR_MS);
  const reportCutoff = new Date(now.getTime() - 4 * HOUR_MS);

  const transport = buildTransport();
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

  const errors: { kind: string; subjectId: string; error: string }[] = [];
  let counts = {
    matchFamily: 0,
    matchCompanion: 0,
    visitConfirmation: 0,
    reportOverdue: 0,
  };

  // ---------------------------------------------------------------
  // Match reminders to family payers (24h overdue, no family reply)
  // ---------------------------------------------------------------
  const familyMatchTargets = await prisma.match.findMany({
    where: {
      status: 'proposed',
      createdAt: { lte: matchCutoff },
      familyResponseAt: null,
      familyReminderSentAt: null,
    },
    include: {
      family: {
        select: {
          members: {
            where: { deletedAt: null },
            include: { user: { select: { email: true } } },
          },
        },
      },
      recipient: { select: { firstName: true, preferredName: true } },
      companion: { select: { firstName: true } },
    },
  });

  for (const m of familyMatchTargets) {
    if (!m.recipient) continue;
    const emails = Array.from(
      new Set(
        m.family.members
          .map((mm) => mm.user.email)
          .filter((e): e is string => Boolean(e)),
      ),
    );
    if (emails.length === 0) continue;
    const input = {
      matchId: m.id,
      recipientFirstName: m.recipient.firstName,
      recipientPreferredName: m.recipient.preferredName,
      companionFirstName: m.companion.firstName,
    };
    let delivered = false;
    for (const to of emails) {
      try {
        await transport.sendMail({
          to,
          from,
          subject: matchReminderToFamilySubject(),
          text: matchReminderToFamilyText(input),
          html: matchReminderToFamilyHtml(input),
        });
        delivered = true;
        await audit({
          actorType: 'system',
          actorId: null,
          actionType: 'state_change',
          targetType: 'Match',
          targetId: m.id,
          metadata: { event: 'match_reminder_email_sent', audience: 'family', to },
        });
      } catch (err) {
        errors.push({
          kind: 'match_family',
          subjectId: m.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (delivered) {
      await prisma.match.update({
        where: { id: m.id },
        data: { familyReminderSentAt: new Date() },
      });
      counts.matchFamily += 1;
    }
  }

  // ---------------------------------------------------------------
  // Match reminders to companion (24h overdue, no companion reply)
  // ---------------------------------------------------------------
  const companionMatchTargets = await prisma.match.findMany({
    where: {
      status: 'proposed',
      createdAt: { lte: matchCutoff },
      companionResponseAt: null,
      companionReminderSentAt: null,
    },
    include: {
      family: { select: { billingName: true } },
      recipient: { select: { firstName: true, preferredName: true } },
      companion: {
        select: { firstName: true, user: { select: { email: true } } },
      },
    },
  });

  for (const m of companionMatchTargets) {
    if (!m.recipient) continue;
    const to = m.companion.user.email;
    if (!to) continue;
    const input = {
      matchId: m.id,
      companionFirstName: m.companion.firstName,
      familyBillingName: m.family.billingName,
      recipientFirstName: m.recipient.firstName,
      recipientPreferredName: m.recipient.preferredName,
    };
    try {
      await transport.sendMail({
        to,
        from,
        subject: matchReminderToCompanionSubject(),
        text: matchReminderToCompanionText(input),
        html: matchReminderToCompanionHtml(input),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Match',
        targetId: m.id,
        metadata: {
          event: 'match_reminder_email_sent',
          audience: 'companion',
          to,
        },
      });
      await prisma.match.update({
        where: { id: m.id },
        data: { companionReminderSentAt: new Date() },
      });
      counts.matchCompanion += 1;
    } catch (err) {
      errors.push({
        kind: 'match_companion',
        subjectId: m.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ---------------------------------------------------------------
  // Visit confirmation reminders (visit ~4h out, still scheduled)
  // ---------------------------------------------------------------
  const confirmationTargets = await prisma.visit.findMany({
    where: {
      state: 'scheduled',
      scheduledStartAt: { gte: now, lte: confirmationWindowEnd },
      confirmationReminderSentAt: null,
    },
    include: {
      recipient: { select: { firstName: true, preferredName: true } },
      companion: {
        select: { firstName: true, user: { select: { email: true } } },
      },
    },
  });

  for (const v of confirmationTargets) {
    const to = v.companion.user.email;
    if (!to) continue;
    const input = {
      visitId: v.id,
      companionFirstName: v.companion.firstName,
      recipientFirstName: v.recipient.firstName,
      recipientPreferredName: v.recipient.preferredName,
      scheduledStartAt: v.scheduledStartAt,
    };
    try {
      await transport.sendMail({
        to,
        from,
        subject: visitConfirmationReminderSubject(input),
        text: visitConfirmationReminderText(input),
        html: visitConfirmationReminderHtml(input),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Visit',
        targetId: v.id,
        metadata: {
          event: 'visit_confirmation_reminder_sent',
          audience: 'companion',
          to,
        },
      });
      await prisma.visit.update({
        where: { id: v.id },
        data: { confirmationReminderSentAt: new Date() },
      });
      counts.visitConfirmation += 1;
    } catch (err) {
      errors.push({
        kind: 'visit_confirmation',
        subjectId: v.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ---------------------------------------------------------------
  // Report overdue reminders (completed >4h ago, no report)
  // ---------------------------------------------------------------
  const reportTargets = await prisma.visit.findMany({
    where: {
      state: 'completed',
      stateChangedAt: { lte: reportCutoff },
      report: null,
      reportReminderSentAt: null,
    },
    include: {
      recipient: { select: { firstName: true, preferredName: true } },
      companion: {
        select: { firstName: true, user: { select: { email: true } } },
      },
    },
  });

  for (const v of reportTargets) {
    const to = v.companion.user.email;
    if (!to) continue;
    const input = {
      visitId: v.id,
      companionFirstName: v.companion.firstName,
      recipientFirstName: v.recipient.firstName,
      recipientPreferredName: v.recipient.preferredName,
      scheduledStartAt: v.scheduledStartAt,
    };
    try {
      await transport.sendMail({
        to,
        from,
        subject: reportOverdueReminderSubject(input),
        text: reportOverdueReminderText(input),
        html: reportOverdueReminderHtml(input),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Visit',
        targetId: v.id,
        metadata: {
          event: 'report_overdue_reminder_sent',
          audience: 'companion',
          to,
        },
      });
      await prisma.visit.update({
        where: { id: v.id },
        data: { reportReminderSentAt: new Date() },
      });
      counts.reportOverdue += 1;
    } catch (err) {
      errors.push({
        kind: 'report_overdue',
        subjectId: v.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ counts, errors });
}

// GET: cheap monitoring summary using the same auth.
export async function GET(req: Request) {
  const expected = process.env.CRON_TOKEN;
  if (!expected) return new NextResponse('Misconfigured', { status: 500 });
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${expected}`) return unauthorized();

  const now = new Date();
  const matchCutoff = new Date(now.getTime() - 24 * HOUR_MS);
  const confirmationWindowEnd = new Date(now.getTime() + 4 * HOUR_MS);
  const reportCutoff = new Date(now.getTime() - 4 * HOUR_MS);

  const [matchFamily, matchCompanion, visitConfirmation, reportOverdue] =
    await Promise.all([
      prisma.match.count({
        where: {
          status: 'proposed',
          createdAt: { lte: matchCutoff },
          familyResponseAt: null,
          familyReminderSentAt: null,
        },
      }),
      prisma.match.count({
        where: {
          status: 'proposed',
          createdAt: { lte: matchCutoff },
          companionResponseAt: null,
          companionReminderSentAt: null,
        },
      }),
      prisma.visit.count({
        where: {
          state: 'scheduled',
          scheduledStartAt: { gte: now, lte: confirmationWindowEnd },
          confirmationReminderSentAt: null,
        },
      }),
      prisma.visit.count({
        where: {
          state: 'completed',
          stateChangedAt: { lte: reportCutoff },
          report: null,
          reportReminderSentAt: null,
        },
      }),
    ]);

  return NextResponse.json({
    due: { matchFamily, matchCompanion, visitConfirmation, reportOverdue },
  });
}
