'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Prisma, VisitState } from '@prisma/client';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser, requireCompanion } from '@/lib/auth-helpers';
import { nextVisitStart, TERMINAL_VISIT_STATES, ukWallClockToUtc } from '@/lib/visit-schedule';
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
import {
  visitRescheduledToFamilyHtml,
  visitRescheduledToFamilyText,
  visitRescheduledToFamilySubject,
  visitRescheduledToCompanionHtml,
  visitRescheduledToCompanionText,
  visitRescheduledToCompanionSubject,
} from '@/lib/email/visit-rescheduled';
import {
  visitStartedToFamilyHtml,
  visitStartedToFamilyText,
  visitStartedToFamilySubject,
} from '@/lib/email/visit-started';

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
// BULK generate the next N visits for a Subscription. Loops the single-shot
// generator; each call anchors on the latest existing visit so the schedule
// walks forward correctly. Per-visit booked emails are suppressed (a batch
// of 12 emails would spam the family); the audit log captures a single
// summary entry. Cap is 12 to avoid runaway loops if someone passes the URL
// directly.
// -------------------------------------------------------------------------

const MAX_BULK_VISITS = 12;

export async function generateBulkVisits(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;
  const subscriptionId = String(formData.get('subscriptionId') ?? '');
  const requested = Number(formData.get('count') ?? '0');
  if (!subscriptionId) return;
  const count = Math.min(
    Math.max(Math.trunc(Number.isFinite(requested) ? requested : 0), 1),
    MAX_BULK_VISITS,
  );

  const createdIds: string[] = [];
  let stopReason: string | null = null;
  for (let i = 0; i < count; i++) {
    const r = await generateNextVisitForSubscription(subscriptionId, {
      actor: 'user',
      actorId: operator.id,
      sendEmails: false,
    });
    if (r.ok) {
      createdIds.push(r.visitId);
    } else {
      stopReason = r.reason;
      break;
    }
  }

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'Subscription',
    targetId: subscriptionId,
    metadata: {
      event: 'visits_bulk_generated',
      requested: count,
      created: createdIds.length,
      stoppedAt: stopReason,
      visitIds: createdIds,
    },
  });

  revalidatePath('/ops');
  revalidatePath('/ops/visits');
  revalidatePath(`/ops/subscriptions/${subscriptionId}`);
}

// -------------------------------------------------------------------------
// EDIT a Visit (date / time / duration / agreed activity / safety flags).
// Restricted to scheduled or confirmed state. If the scheduled time
// changes, a "rescheduled" email goes to both sides.
// -------------------------------------------------------------------------

const EditVisitSchema = z.object({
  visitId: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM.'),
  scheduledDurationMinutes: z.coerce.number().int().min(30).max(480),
  agreedActivity: z.string().max(2000).optional(),
  safetyFlags: z.string().max(2000).optional(),
  // SDD Addendum §2: empty string = no cover present on this visit. A
  // non-empty value must match the named cover on the originating match;
  // arbitrary companions cannot be marked as cover.
  secondaryCompanionId: z.string().optional(),
});

export type EditVisitState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function editVisit(
  _prev: EditVisitState,
  formData: FormData,
): Promise<EditVisitState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    visitId: String(formData.get('visitId') ?? ''),
    scheduledDate: String(formData.get('scheduledDate') ?? '').trim(),
    scheduledTime: String(formData.get('scheduledTime') ?? '').trim(),
    scheduledDurationMinutes: String(formData.get('scheduledDurationMinutes') ?? ''),
    agreedActivity: String(formData.get('agreedActivity') ?? '').trim() || undefined,
    safetyFlags: String(formData.get('safetyFlags') ?? '').trim() || undefined,
    secondaryCompanionId: String(formData.get('secondaryCompanionId') ?? '').trim() || undefined,
  };

  const parsed = EditVisitSchema.safeParse(raw);
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
      familyId: true,
      subscriptionId: true,
      scheduledStartAt: true,
      scheduledDurationMinutes: true,
      agreedActivity: true,
      safetyFlags: true,
      secondaryCompanionId: true,
      subscription: {
        select: {
          originatingMatch: {
            select: { coverCompanionId: true },
          },
        },
      },
    },
  });
  if (!before) return { ok: false, errors: { _form: 'Visit not found.' }, values: raw };
  if (before.state !== 'scheduled' && before.state !== 'confirmed') {
    return {
      ok: false,
      errors: { _form: `Cannot edit a visit in state ${before.state}.` },
      values: raw,
    };
  }

  // Cover companion on a visit must match the named cover on the
  // originating match. Empty = no cover present. Any other value is a
  // misuse of the picker (or stale form state).
  const matchCoverId = before.subscription.originatingMatch?.coverCompanionId ?? null;
  const nextSecondaryCompanionId = d.secondaryCompanionId
    ? d.secondaryCompanionId === matchCoverId
      ? matchCoverId
      : null
    : null;
  if (d.secondaryCompanionId && nextSecondaryCompanionId === null) {
    return {
      ok: false,
      errors: { secondaryCompanionId: 'Only the named cover companion can be marked as present.' },
      values: raw,
    };
  }

  const [y, mo, dy] = d.scheduledDate.split('-').map(Number);
  const [hh, mm] = d.scheduledTime.split(':').map(Number);
  if (!y || !mo || !dy || hh == null || mm == null) {
    return { ok: false, errors: { _form: 'Invalid date or time.' }, values: raw };
  }
  const newStartAt = ukWallClockToUtc(y, mo - 1, dy, hh, mm);

  const changed: string[] = [];
  if (newStartAt.getTime() !== before.scheduledStartAt.getTime()) changed.push('scheduledStartAt');
  if (d.scheduledDurationMinutes !== before.scheduledDurationMinutes) changed.push('scheduledDurationMinutes');
  if ((d.agreedActivity ?? null) !== (before.agreedActivity ?? null)) changed.push('agreedActivity');
  if ((d.safetyFlags ?? null) !== (before.safetyFlags ?? null)) changed.push('safetyFlags');
  if ((nextSecondaryCompanionId ?? null) !== (before.secondaryCompanionId ?? null)) changed.push('secondaryCompanionId');

  if (changed.length === 0) {
    redirect(`/ops/visits/${d.visitId}`);
  }

  await prisma.visit.update({
    where: { id: d.visitId },
    data: {
      scheduledStartAt: newStartAt,
      scheduledDurationMinutes: d.scheduledDurationMinutes,
      agreedActivity: d.agreedActivity ?? null,
      safetyFlags: d.safetyFlags ?? null,
      secondaryCompanionId: nextSecondaryCompanionId,
    },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'update',
    targetType: 'Visit',
    targetId: d.visitId,
    beforeState: {
      scheduledStartAt: before.scheduledStartAt.toISOString(),
      scheduledDurationMinutes: before.scheduledDurationMinutes,
      agreedActivity: before.agreedActivity,
      safetyFlags: before.safetyFlags,
      secondaryCompanionId: before.secondaryCompanionId,
    },
    afterState: {
      scheduledStartAt: newStartAt.toISOString(),
      scheduledDurationMinutes: d.scheduledDurationMinutes,
      agreedActivity: d.agreedActivity ?? null,
      safetyFlags: d.safetyFlags ?? null,
      secondaryCompanionId: nextSecondaryCompanionId,
    },
    metadata: { event: 'visit_updated', changedFields: changed },
  });

  // Only fire the rescheduled email when the time-on-the-calendar
  // actually changed. Notes-only edits stay quiet.
  if (
    changed.includes('scheduledStartAt') ||
    changed.includes('scheduledDurationMinutes')
  ) {
    await sendVisitRescheduledEmails(d.visitId, before.scheduledStartAt);
  }

  revalidatePath('/ops');
  revalidatePath('/ops/visits');
  revalidatePath(`/ops/visits/${d.visitId}`);
  revalidatePath(`/ops/subscriptions/${before.subscriptionId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
  redirect(`/ops/visits/${d.visitId}`);
}

async function sendVisitRescheduledEmails(
  visitId: string,
  previousStartAt: Date,
): Promise<void> {
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
  if (!visit) return;

  const transport = buildTransport();
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

  const shared = {
    previousStartAt,
    scheduledStartAt: visit.scheduledStartAt,
    scheduledDurationMinutes: visit.scheduledDurationMinutes,
    recipientFirstName: visit.recipient.firstName,
    recipientPreferredName: visit.recipient.preferredName,
    companionFirstName: visit.companion.firstName,
    companionLastName: visit.companion.lastName,
    familyBillingName: visit.family.billingName,
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
        subject: visitRescheduledToFamilySubject(shared),
        text: visitRescheduledToFamilyText(shared),
        html: visitRescheduledToFamilyHtml(shared),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Visit',
        targetId: visitId,
        metadata: { event: 'visit_rescheduled_email_sent', audience: 'family', to },
      });
    } catch (err) {
      console.error('[visit] rescheduled email to family failed', { to, visitId, err });
    }
  }

  const companionEmail = visit.companion.user.email;
  if (companionEmail) {
    try {
      await transport.sendMail({
        to: companionEmail,
        from,
        subject: visitRescheduledToCompanionSubject(shared),
        text: visitRescheduledToCompanionText(shared),
        html: visitRescheduledToCompanionHtml(shared),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Visit',
        targetId: visitId,
        metadata: { event: 'visit_rescheduled_email_sent', audience: 'companion', to: companionEmail },
      });
    } catch (err) {
      console.error('[visit] rescheduled email to companion failed', {
        to: companionEmail,
        visitId,
        err,
      });
    }
  }
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
  if (d.to === 'in_progress') {
    await sendVisitStartedEmail(d.visitId);
  }

  revalidatePath('/ops');
  revalidatePath('/ops/visits');
  revalidatePath(`/ops/visits/${d.visitId}`);
  revalidatePath(`/ops/subscriptions/${before.subscriptionId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
}

// -------------------------------------------------------------------------
// COMPANION-DRIVEN transitions. Subset of the operator state machine
// scoped to moves the companion can sensibly make themselves: confirm,
// en route, in progress, completed, cancelled_by_companion. The
// operator can still drive any transition via the existing route -
// these two paths are additive.
// -------------------------------------------------------------------------

const COMPANION_ALLOWED_TRANSITIONS: Record<string, VisitState[]> = {
  scheduled: ['confirmed', 'en_route', 'cancelled_by_companion'],
  confirmed: ['en_route', 'in_progress', 'cancelled_by_companion'],
  en_route: ['in_progress', 'cancelled_by_companion'],
  in_progress: ['completed'],
  completed: [],
  reported: [],
  cancelled_by_family: [],
  cancelled_by_companion: [],
  cancelled_by_operator: [],
  no_show_companion: [],
  no_show_recipient: [],
};

const CompanionTransitionSchema = z.object({
  visitId: z.string().min(1),
  to: z.enum([
    'confirmed',
    'en_route',
    'in_progress',
    'completed',
    'cancelled_by_companion',
  ]),
  note: z.string().max(2000).optional(),
});

export async function transitionVisitByCompanion(formData: FormData): Promise<void> {
  'use server';
  const { user, companion } = await requireCompanion('/companion');

  const parsed = CompanionTransitionSchema.safeParse({
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
      companionId: true,
      subscriptionId: true,
      familyId: true,
      scheduledStartAt: true,
    },
  });
  // Scope: the visit must belong to this companion.
  if (!before || before.companionId !== companion.id) return;
  const allowed = COMPANION_ALLOWED_TRANSITIONS[before.state] ?? [];
  if (!allowed.includes(d.to)) return;

  // Cancellation requires a reason. Quietly drop the request if missing -
  // the form-side validation should have caught it.
  const isCancel = d.to === 'cancelled_by_companion';
  if (isCancel && !d.note) return;

  const now = new Date();
  const data: Prisma.VisitUncheckedUpdateInput = {
    state: d.to,
    stateChangedAt: now,
  };
  if (d.to === 'in_progress') data.actualStartAt = now;
  if (d.to === 'completed') data.actualEndAt = now;
  if (isCancel) {
    data.cancellationActor = 'companion';
    data.cancellationReason = d.note ?? null;
  }

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
    actorId: user.id,
    actorRole: user.role,
    actionType: 'state_change',
    targetType: 'Visit',
    targetId: d.visitId,
    beforeState: { state: before.state },
    afterState: { state: d.to },
    metadata: {
      event: 'visit_state_change',
      via: 'companion_portal',
      ...(d.note ? { note: d.note } : {}),
    },
  });

  if (isCancel) {
    await sendVisitCancelledEmails(d.visitId);
  }
  if (d.to === 'in_progress') {
    await sendVisitStartedEmail(d.visitId);
  }

  revalidatePath('/companion');
  revalidatePath('/companion/visits');
  revalidatePath(`/companion/visits/${d.visitId}`);
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

async function sendVisitStartedEmail(visitId: string): Promise<void> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
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
  if (!visit) return;

  const transport = buildTransport();
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

  const input = {
    recipientFirstName: visit.recipient.firstName,
    recipientPreferredName: visit.recipient.preferredName,
    companionFirstName: visit.companion.firstName,
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
        subject: visitStartedToFamilySubject(input),
        text: visitStartedToFamilyText(input),
        html: visitStartedToFamilyHtml(input),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Visit',
        targetId: visitId,
        metadata: { event: 'visit_started_email_sent', audience: 'family', to },
      });
    } catch (err) {
      console.error('[visit] started email to family failed', { to, visitId, err });
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
