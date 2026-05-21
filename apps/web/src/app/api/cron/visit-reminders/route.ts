import { NextResponse } from 'next/server';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import {
  visitReminderToFamilyHtml,
  visitReminderToFamilyText,
  visitReminderToFamilySubject,
  visitReminderToCompanionHtml,
  visitReminderToCompanionText,
  visitReminderToCompanionSubject,
} from '@/lib/email/visit-reminder';

// Cron endpoint: hit hourly by the systemd timer at
// yaigc-visit-reminders.timer. Token-gated via Authorization header.
// Idempotent on Visit.reminderSentAt - second runs in the same window
// skip already-sent visits.

const HOUR_MS = 60 * 60 * 1000;

function unauthorized() {
  return new NextResponse('Unauthorized', { status: 401 });
}

export async function POST(req: Request) {
  const expected = process.env.CRON_TOKEN;
  if (!expected) {
    console.error('[cron] CRON_TOKEN not configured');
    return new NextResponse('Misconfigured', { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${expected}`) {
    return unauthorized();
  }

  const now = new Date();
  // Window: visits scheduled between now+23h and now+25h. Combined with
  // the reminderSentAt idempotency check, every visit gets one reminder
  // ~24h before regardless of cron drift or duplicate runs.
  const windowStart = new Date(now.getTime() + 23 * HOUR_MS);
  const windowEnd = new Date(now.getTime() + 25 * HOUR_MS);

  const due = await prisma.visit.findMany({
    where: {
      state: { in: ['scheduled', 'confirmed'] },
      scheduledStartAt: { gte: windowStart, lt: windowEnd },
      reminderSentAt: null,
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
      recipient: {
        select: {
          firstName: true,
          preferredName: true,
          addressLine1: true,
          addressLine2: true,
          addressCity: true,
          addressPostcode: true,
        },
      },
      companion: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  if (due.length === 0) {
    return NextResponse.json({ processed: 0, skipped: 0, errors: [] });
  }

  const transport = createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

  let processed = 0;
  const errors: { visitId: string; error: string }[] = [];

  for (const v of due) {
    const familyShared = {
      scheduledStartAt: v.scheduledStartAt,
      recipientFirstName: v.recipient.firstName,
      recipientPreferredName: v.recipient.preferredName,
      companionFirstName: v.companion.firstName,
      companionLastName: v.companion.lastName,
    };

    const familyEmails = Array.from(
      new Set(
        v.family.members
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
          subject: visitReminderToFamilySubject(familyShared),
          text: visitReminderToFamilyText(familyShared),
          html: visitReminderToFamilyHtml(familyShared),
        });
        anyDelivered = true;
        await audit({
          actorType: 'system',
          actorId: null,
          actionType: 'state_change',
          targetType: 'Visit',
          targetId: v.id,
          metadata: { event: 'visit_reminder_email_sent', audience: 'family', to },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ visitId: v.id, error: `family ${to}: ${msg}` });
      }
    }

    const companionEmail = v.companion.user.email;
    if (companionEmail) {
      try {
        await transport.sendMail({
          to: companionEmail,
          from,
          subject: visitReminderToCompanionSubject({
            ...familyShared,
            addressLine1: v.recipient.addressLine1,
            addressLine2: v.recipient.addressLine2,
            addressCity: v.recipient.addressCity,
            addressPostcode: v.recipient.addressPostcode,
          }),
          text: visitReminderToCompanionText({
            ...familyShared,
            addressLine1: v.recipient.addressLine1,
            addressLine2: v.recipient.addressLine2,
            addressCity: v.recipient.addressCity,
            addressPostcode: v.recipient.addressPostcode,
          }),
          html: visitReminderToCompanionHtml({
            ...familyShared,
            addressLine1: v.recipient.addressLine1,
            addressLine2: v.recipient.addressLine2,
            addressCity: v.recipient.addressCity,
            addressPostcode: v.recipient.addressPostcode,
          }),
        });
        anyDelivered = true;
        await audit({
          actorType: 'system',
          actorId: null,
          actionType: 'state_change',
          targetType: 'Visit',
          targetId: v.id,
          metadata: {
            event: 'visit_reminder_email_sent',
            audience: 'companion',
            to: companionEmail,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ visitId: v.id, error: `companion: ${msg}` });
      }
    }

    if (anyDelivered) {
      await prisma.visit.update({
        where: { id: v.id },
        data: { reminderSentAt: new Date() },
      });
      processed += 1;
    }
  }

  return NextResponse.json({ processed, total: due.length, errors });
}

// GET for cheap monitoring - same auth, returns the count of visits
// currently due for a reminder. systemd timer uses POST.
export async function GET(req: Request) {
  const expected = process.env.CRON_TOKEN;
  if (!expected) return new NextResponse('Misconfigured', { status: 500 });
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${expected}`) return unauthorized();

  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * HOUR_MS);
  const windowEnd = new Date(now.getTime() + 25 * HOUR_MS);
  const count = await prisma.visit.count({
    where: {
      state: { in: ['scheduled', 'confirmed'] },
      scheduledStartAt: { gte: windowStart, lt: windowEnd },
      reminderSentAt: null,
    },
  });
  return NextResponse.json({ due: count });
}
