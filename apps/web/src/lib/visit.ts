'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Prisma, VisitState } from '@prisma/client';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';
import { nextVisitStart, TERMINAL_VISIT_STATES } from '@/lib/visit-schedule';
import {
  visitBookedToFamilyHtml,
  visitBookedToFamilyText,
  visitBookedToFamilySubject,
  visitBookedToCompanionHtml,
  visitBookedToCompanionText,
  visitBookedToCompanionSubject,
} from '@/lib/email/visit-booked';
import {
  visitCancelledToFamilyHtml,
  visitCancelledToFamilyText,
  visitCancelledToFamilySubject,
  visitCancelledToCompanionHtml,
  visitCancelledToCompanionText,
  visitCancelledToCompanionSubject,
} from '@/lib/email/visit-cancelled';

// -------------------------------------------------------------------------
// GENERATE the next Visit for a Subscription.
//
// Exported for two callers:
//   1. subscription.ts createSubscription -> generate the first visit
//   2. the manual "Generate next visit" operator action below
// -------------------------------------------------------------------------

export async function generateNextVisitForSubscription(
  subscriptionId: string,
  options: { actor?: 'user' | 'system'; actorId?: string | null; sendEmails?: boolean } = {},
): Promise<{ ok: true; visitId: string } | { ok: false; reason: string }> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      status: true,
      familyId: true,
      recipientId: true,
      companionId: true,
      frequency: true,
      dayOfWeek: true,
      startTime: true,
      durationMinutes: true,
      startedAt: true,
      notes: true,
    },
  });
  if (!sub) return { ok: false, reason: 'subscription_not_found' };
  if (sub.status !== 'active') {
    return { ok: false, reason: `subscription_${sub.status}` };
  }

  // Anchor the next-visit search at the later of (now, most recent existing
  // visit's scheduledStartAt) so we don't double-book the same slot.
  const last = await prisma.visit.findFirst({
    where: { subscriptionId: sub.id },
    orderBy: { scheduledStartAt: 'desc' },
    select: { scheduledStartAt: true },
  });
  const now = new Date();
  const after = last && last.scheduledStartAt.getTime() > now.getTime() ? last.scheduledStartAt : now;

  const scheduledStartAt = nextVisitStart(
    {
      frequency: sub.frequency,
      dayOfWeek: sub.dayOfWeek,
      startTime: sub.startTime,
      startedAt: sub.startedAt,
    },
    after,
  );

  const visit = await prisma.visit.create({
    data: {
      subscriptionId: sub.id,
      familyId: sub.familyId,
      recipientId: sub.recipientId,
      companionId: sub.companionId,
      scheduledStartAt,
      scheduledDurationMinutes: sub.durationMinutes,
      agreedActivity: sub.notes,
    },
  });

  await audit({
    actorType: options.actor ?? 'system',
    actorId: options.actorId ?? null,
    actionType: 'create',
    targetType: 'Visit',
    targetId: visit.id,
    afterState: {
      subscriptionId: sub.id,
      scheduledStartAt: scheduledStartAt.toISOString(),
      state: 'scheduled',
    },
    metadata: { event: 'visit_generated' },
  });

  if (options.sendEmails !== false) {
    await sendVisitBookedEmails(visit.id);
  }

  revalidatePath('/ops');
  revalidatePath('/ops/visits');
  revalidatePath(`/ops/subscriptions/${sub.id}`);
  revalidatePath(`/ops/families/${sub.familyId}`);

  return { ok: true, visitId: visit.id };
}

export async function generateNextVisit(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;
  const subscriptionId = String(formData.get('subscriptionId') ?? '');
  if (!subscriptionId) return;
  await generateNextVisitForSubscription(subscriptionId, {
    actor: 'user',
    actorId: operator.id,
  });
}

// -------------------------------------------------------------------------
// TRANSITION visit state. The state machine is driven by the operator;
// we accept any move that the validation map allows.
// -------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<VisitState, VisitState[]> = {
  scheduled: ['confirmed', 'cancelled_by_family', 'cancelled_by_companion', 'cancelled_by_operator', 'en_route', 'in_progress', 'no_show_companion', 'no_show_recipient'],
  confirmed: ['en_route', 'in_progress', 'cancelled_by_family', 'cancelled_by_companion', 'cancelled_by_operator', 'no_show_companion', 'no_show_recipient'],
  en_route: ['in_progress', 'no_show_recipient', 'cancelled_by_companion', 'cancelled_by_operator'],
  in_progress: ['completed'],
  completed: ['reported'],
  reported: [],
  cancelled_by_family: [],
  cancelled_by_companion: [],
  cancelled_by_operator: [],
  no_show_companion: [],
  no_show_recipient: [],
};

const TransitionSchema = z.object({
  visitId: z.string().min(1),
  to: z.enum([
    'confirmed',
    'en_route',
    'in_progress',
    'completed',
    'reported',
    'cancelled_by_family',
    'cancelled_by_companion',
    'cancelled_by_operator',
    'no_show_companion',
    'no_show_recipient',
  ]),
  note: z.string().max(2000).optional(),
});

export async function transitionVisit(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;

  const parsed = TransitionSchema.safeParse({
    visitId: String(formData.get('visitId') ?? ''),
    to: String(formData.get('to') ?? ''),
    note: String(formData.get('note') ?? '').trim() || undefined,
  });
  if (!parsed.success) return;
  const d = parsed.data;

  const before = await prisma.visit.findUnique({
    where: { id: d.visitId },
    select: {
      state: true,
      subscriptionId: true,
      familyId: true,
      scheduledStartAt: true,
      scheduledDurationMinutes: true,
    },
  });
  if (!before) return;
  if (!ALLOWED_TRANSITIONS[before.state].includes(d.to)) return;

  const now = new Date();
  const isCancel = d.to.startsWith('cancelled_');
  const isNoShow = d.to.startsWith('no_show_');

  const data: Prisma.VisitUncheckedUpdateInput = {
    state: d.to,
    stateChangedAt: now,
  };
  if (d.to === 'in_progress') data.actualStartAt = now;
  if (d.to === 'completed') {
    data.actualEndAt = now;
    // If actualStartAt is null (operator skipped en_route/in_progress),
    // approximate from the scheduled slot - prevents NULLs in billing.
    // updateMany doesn't run conditionally here so we just leave actualStartAt
    // alone if already set; the update below sets it from before.scheduledStartAt
    // only when null.
  }
  if (isCancel) {
    data.cancellationActor =
      d.to === 'cancelled_by_family'
        ? 'family'
        : d.to === 'cancelled_by_companion'
        ? 'companion'
        : 'operator';
    if (d.note) data.cancellationReason = d.note;
  }
  if (isNoShow && d.note) data.cancellationReason = d.note;

  await prisma.visit.update({ where: { id: d.visitId }, data });

  // Backfill actualStartAt for completed if it was somehow skipped.
  if (d.to === 'completed') {
    await prisma.visit.updateMany({
      where: { id: d.visitId, actualStartAt: null },
      data: { actualStartAt: before.scheduledStartAt },
    });
  }

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'state_change',
    targetType: 'Visit',
    targetId: d.visitId,
    beforeState: { state: before.state },
    afterState: { state: d.to },
    metadata: {
      event: 'visit_state_change',
      ...(d.note ? { note: d.note } : {}),
    },
  });

  if (isCancel) {
    await sendVisitCancelledEmails(d.visitId);
  }

  revalidatePath('/ops');
  revalidatePath('/ops/visits');
  revalidatePath(`/ops/visits/${d.visitId}`);
  revalidatePath(`/ops/subscriptions/${before.subscriptionId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
}

// -------------------------------------------------------------------------
// EMAILS
// -------------------------------------------------------------------------

function buildTransport() {
  return createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
}

async function sendVisitBookedEmails(visitId: string): Promise<void> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      family: {
        select: {
          billingName: true,
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
          thingsToKnow: true,
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
  if (!visit) return;

  const transport = buildTransport();
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

  const sharedFamily = {
    scheduledStartAt: visit.scheduledStartAt,
    scheduledDurationMinutes: visit.scheduledDurationMinutes,
    recipientFirstName: visit.recipient.firstName,
    recipientPreferredName: visit.recipient.preferredName,
    companionFirstName: visit.companion.firstName,
    companionLastName: visit.companion.lastName,
    familyBillingName: visit.family.billingName,
    agreedActivity: visit.agreedActivity,
  };

  const familyEmails = Array.from(
    new Set(
      visit.family.members.map((m) => m.user.email).filter((e): e is string => Boolean(e)),
    ),
  );
  for (const to of familyEmails) {
    try {
      await transport.sendMail({
        to,
        from,
        subject: visitBookedToFamilySubject(sharedFamily),
        text: visitBookedToFamilyText(sharedFamily),
        html: visitBookedToFamilyHtml(sharedFamily),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Visit',
        targetId: visitId,
        metadata: { event: 'visit_booked_email_sent', audience: 'family', to },
      });
    } catch (err) {
      console.error('[visit] booked email to family failed', { to, visitId, err });
    }
  }

  const companionEmail = visit.companion.user.email;
  if (companionEmail) {
    const companionInput = {
      ...sharedFamily,
      addressLine1: visit.recipient.addressLine1,
      addressLine2: visit.recipient.addressLine2,
      addressCity: visit.recipient.addressCity,
      addressPostcode: visit.recipient.addressPostcode,
      thingsToKnow: visit.recipient.thingsToKnow,
    };
    try {
      await transport.sendMail({
        to: companionEmail,
        from,
        subject: visitBookedToCompanionSubject(companionInput),
        text: visitBookedToCompanionText(companionInput),
        html: visitBookedToCompanionHtml(companionInput),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Visit',
        targetId: visitId,
        metadata: { event: 'visit_booked_email_sent', audience: 'companion', to: companionEmail },
      });
    } catch (err) {
      console.error('[visit] booked email to companion failed', { to: companionEmail, visitId, err });
    }
  }
}

async function sendVisitCancelledEmails(visitId: string): Promise<void> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      family: {
        select: {
          billingName: true,
          members: {
            where: { deletedAt: null },
            include: { user: { select: { email: true } } },
          },
        },
      },
      recipient: { select: { firstName: true, preferredName: true } },
      companion: {
        select: { firstName: true, lastName: true, user: { select: { email: true } } },
      },
    },
  });
  if (!visit || !visit.cancellationActor) return;

  const transport = buildTransport();
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

  const shared = {
    scheduledStartAt: visit.scheduledStartAt,
    recipientFirstName: visit.recipient.firstName,
    recipientPreferredName: visit.recipient.preferredName,
    companionFirstName: visit.companion.firstName,
    companionLastName: visit.companion.lastName,
    cancellationActor: visit.cancellationActor,
    cancellationReason: visit.cancellationReason,
  };

  const familyEmails = Array.from(
    new Set(
      visit.family.members.map((m) => m.user.email).filter((e): e is string => Boolean(e)),
    ),
  );
  for (const to of familyEmails) {
    try {
      await transport.sendMail({
        to,
        from,
        subject: visitCancelledToFamilySubject(),
        text: visitCancelledToFamilyText(shared),
        html: visitCancelledToFamilyHtml(shared),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Visit',
        targetId: visitId,
        metadata: { event: 'visit_cancelled_email_sent', audience: 'family', to },
      });
    } catch (err) {
      console.error('[visit] cancelled email to family failed', { to, visitId, err });
    }
  }

  const companionEmail = visit.companion.user.email;
  if (companionEmail) {
    try {
      await transport.sendMail({
        to: companionEmail,
        from,
        subject: visitCancelledToCompanionSubject(),
        text: visitCancelledToCompanionText({ ...shared, familyBillingName: visit.family.billingName }),
        html: visitCancelledToCompanionHtml({ ...shared, familyBillingName: visit.family.billingName }),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Visit',
        targetId: visitId,
        metadata: { event: 'visit_cancelled_email_sent', audience: 'companion', to: companionEmail },
      });
    } catch (err) {
      console.error('[visit] cancelled email to companion failed', {
        to: companionEmail,
        visitId,
        err,
      });
    }
  }

  // Mark TERMINAL_VISIT_STATES dependency to silence unused-import warning;
  // exported separately to keep visit-schedule pure.
  void TERMINAL_VISIT_STATES;
}
