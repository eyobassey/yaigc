'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';
import {
  subscriptionCreatedToFamilyHtml,
  subscriptionCreatedToFamilyText,
  subscriptionCreatedToFamilySubject,
  subscriptionCreatedToCompanionHtml,
  subscriptionCreatedToCompanionText,
  subscriptionCreatedToCompanionSubject,
} from '@/lib/email/subscription-created';

// -------------------------------------------------------------------------
// CREATE
// -------------------------------------------------------------------------

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const CreateSchema = z.object({
  familyId: z.string().min(1),
  recipientId: z.string().min(1),
  companionId: z.string().min(1),
  originatingMatchId: z.string().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  dayOfWeek: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  startTime: z.string().regex(TIME_RE, 'Use 24-hour format like 14:00.'),
  durationMinutes: z.coerce
    .number()
    .int('Use a whole number of minutes.')
    .min(30, 'At least 30 minutes.')
    .max(480, 'No single visit longer than 8 hours.'),
  hourlyRate: z.coerce
    .number()
    .min(8, 'Hourly rate is at least £8.')
    .max(60, 'Hourly rate cannot exceed £60.'),
  notes: z.string().max(2000).optional(),
});

export type CreateSubscriptionState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function createSubscription(
  _prev: CreateSubscriptionState,
  formData: FormData,
): Promise<CreateSubscriptionState> {
  const operator = await getSessionUser();
  if (!operator) return { ok: false, errors: { _form: 'Not signed in.' } };

  const raw = {
    familyId: String(formData.get('familyId') ?? ''),
    recipientId: String(formData.get('recipientId') ?? ''),
    companionId: String(formData.get('companionId') ?? ''),
    originatingMatchId: String(formData.get('originatingMatchId') ?? '') || undefined,
    frequency: String(formData.get('frequency') ?? ''),
    dayOfWeek: String(formData.get('dayOfWeek') ?? ''),
    startTime: String(formData.get('startTime') ?? '').trim(),
    durationMinutes: String(formData.get('durationMinutes') ?? ''),
    hourlyRate: String(formData.get('hourlyRate') ?? ''),
    notes: String(formData.get('notes') ?? '').trim() || undefined,
  };

  const parsed = CreateSchema.safeParse(raw);
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

  // Recipient must belong to the family. Companion must be bookable.
  // Originating match (if given) must belong to the same family/companion
  // and be in 'accepted' status. Each subscription pins exactly one match.
  const [recipient, companion, match] = await Promise.all([
    prisma.recipient.findUnique({ where: { id: d.recipientId } }),
    prisma.companion.findUnique({ where: { id: d.companionId } }),
    d.originatingMatchId
      ? prisma.match.findUnique({ where: { id: d.originatingMatchId } })
      : null,
  ]);
  if (!recipient || recipient.familyId !== d.familyId) {
    return { ok: false, errors: { recipientId: 'Recipient does not belong to this family.' }, values: raw };
  }
  if (!companion || (companion.status !== 'onboarding' && companion.status !== 'active')) {
    return { ok: false, errors: { companionId: 'Companion is not currently bookable.' }, values: raw };
  }
  if (d.originatingMatchId) {
    if (
      !match ||
      match.familyId !== d.familyId ||
      match.candidateCompanionId !== d.companionId ||
      match.status !== 'accepted'
    ) {
      return { ok: false, errors: { _form: 'Originating match no longer eligible.' }, values: raw };
    }
    const existingFromMatch = await prisma.subscription.findUnique({
      where: { originatingMatchId: d.originatingMatchId },
    });
    if (existingFromMatch) {
      return { ok: false, errors: { _form: 'A subscription already exists for this match.' }, values: raw };
    }
  }

  const sub = await prisma.subscription.create({
    data: {
      familyId: d.familyId,
      recipientId: d.recipientId,
      companionId: d.companionId,
      originatingMatchId: d.originatingMatchId ?? null,
      frequency: d.frequency,
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      durationMinutes: d.durationMinutes,
      hourlyRate: new Prisma.Decimal(d.hourlyRate.toFixed(2)),
      notes: d.notes ?? null,
    },
  });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'create',
    targetType: 'Subscription',
    targetId: sub.id,
    afterState: {
      familyId: sub.familyId,
      recipientId: sub.recipientId,
      companionId: sub.companionId,
      frequency: sub.frequency,
      dayOfWeek: sub.dayOfWeek,
      startTime: sub.startTime,
      durationMinutes: sub.durationMinutes,
      hourlyRate: sub.hourlyRate.toString(),
      originatingMatchId: sub.originatingMatchId,
    },
    metadata: { event: 'subscription_created' },
  });

  // Move the Family to 'active' on first subscription. Idempotent: the
  // updateMany predicate is a no-op for already-active families.
  await prisma.family.updateMany({
    where: { id: d.familyId, status: 'prospect' },
    data: { status: 'active' },
  });

  await sendSubscriptionCreatedEmails(sub.id);

  revalidatePath('/ops');
  revalidatePath('/ops/matches');
  revalidatePath(`/ops/families/${sub.familyId}`);
  if (d.originatingMatchId) revalidatePath(`/ops/matches/${d.originatingMatchId}`);
  redirect(`/ops/subscriptions/${sub.id}`);
}

// -------------------------------------------------------------------------
// PAUSE / RESUME / CANCEL
// -------------------------------------------------------------------------

const TransitionSchema = z.object({
  subscriptionId: z.string().min(1),
  to: z.enum(['paused', 'active', 'canceled']),
  // For pause: optional planned-resume date.
  pauseEndAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  note: z.string().max(2000).optional(),
});

export async function transitionSubscription(formData: FormData): Promise<void> {
  'use server';
  const operator = await getSessionUser();
  if (!operator) return;

  const parsed = TransitionSchema.safeParse({
    subscriptionId: String(formData.get('subscriptionId') ?? ''),
    to: String(formData.get('to') ?? ''),
    pauseEndAt: String(formData.get('pauseEndAt') ?? '').trim() || undefined,
    note: String(formData.get('note') ?? '').trim() || undefined,
  });
  if (!parsed.success) return;
  const d = parsed.data;

  const before = await prisma.subscription.findUnique({
    where: { id: d.subscriptionId },
    select: { status: true, familyId: true },
  });
  if (!before) return;

  // Allowed transitions: active->paused, paused->active, * -> canceled.
  const ok =
    (d.to === 'paused' && before.status === 'active') ||
    (d.to === 'active' && before.status === 'paused') ||
    (d.to === 'canceled' && before.status !== 'canceled');
  if (!ok) return;

  const now = new Date();
  const data: Prisma.SubscriptionUncheckedUpdateInput = { status: d.to };
  if (d.to === 'paused') {
    data.pauseStartAt = now;
    data.pauseEndAt = d.pauseEndAt ? new Date(`${d.pauseEndAt}T00:00:00.000Z`) : null;
  } else if (d.to === 'active') {
    data.pauseStartAt = null;
    data.pauseEndAt = null;
  } else if (d.to === 'canceled') {
    data.endedAt = now;
    if (d.note) data.cancellationReason = d.note;
  }

  await prisma.subscription.update({ where: { id: d.subscriptionId }, data });

  await audit({
    actorType: 'user',
    actorId: operator.id,
    actorRole: operator.role,
    actionType: 'state_change',
    targetType: 'Subscription',
    targetId: d.subscriptionId,
    beforeState: { status: before.status },
    afterState: { status: d.to },
    metadata: {
      event: 'subscription_status_change',
      ...(d.note ? { note: d.note } : {}),
      ...(d.to === 'paused' && d.pauseEndAt ? { pauseEndAt: d.pauseEndAt } : {}),
    },
  });

  revalidatePath('/ops');
  revalidatePath(`/ops/subscriptions/${d.subscriptionId}`);
  revalidatePath(`/ops/families/${before.familyId}`);
}

// -------------------------------------------------------------------------
// EMAIL: on createSubscription, confirm to family (all members) + companion
// -------------------------------------------------------------------------

async function sendSubscriptionCreatedEmails(subscriptionId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      family: {
        select: {
          id: true,
          billingName: true,
          members: {
            where: { deletedAt: null },
            include: { user: { select: { email: true } } },
          },
        },
      },
      recipient: { select: { firstName: true, preferredName: true } },
      companion: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
    },
  });
  if (!sub) return;

  const transport = createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
  const from = `${brand.fullName} <${process.env.EMAIL_SENDER}>`;

  const schedule = {
    frequency: sub.frequency,
    dayOfWeek: sub.dayOfWeek,
    startTime: sub.startTime,
    durationMinutes: sub.durationMinutes,
    hourlyRate: sub.hourlyRate.toString(),
  };

  // Family side: every active member.
  const familyEmails = Array.from(
    new Set(
      sub.family.members
        .map((m) => m.user.email)
        .filter((e): e is string => Boolean(e)),
    ),
  );
  const familyInput = {
    ...schedule,
    recipientFirstName: sub.recipient.firstName,
    recipientPreferredName: sub.recipient.preferredName,
    companionFirstName: sub.companion.firstName,
    companionLastName: sub.companion.lastName,
  };
  for (const to of familyEmails) {
    try {
      await transport.sendMail({
        to,
        from,
        subject: subscriptionCreatedToFamilySubject(),
        text: subscriptionCreatedToFamilyText(familyInput),
        html: subscriptionCreatedToFamilyHtml(familyInput),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Subscription',
        targetId: subscriptionId,
        metadata: {
          event: 'subscription_confirmation_email_sent',
          audience: 'family',
          to,
        },
      });
    } catch (err) {
      console.error('[subscription] family confirmation email failed', {
        to,
        subscriptionId,
        err,
      });
    }
  }

  // Companion side.
  const companionEmail = sub.companion.user.email;
  if (companionEmail) {
    const companionInput = {
      ...schedule,
      companionFirstName: sub.companion.firstName,
      familyBillingName: sub.family.billingName,
      recipientFirstName: sub.recipient.firstName,
      recipientPreferredName: sub.recipient.preferredName,
    };
    try {
      await transport.sendMail({
        to: companionEmail,
        from,
        subject: subscriptionCreatedToCompanionSubject(),
        text: subscriptionCreatedToCompanionText(companionInput),
        html: subscriptionCreatedToCompanionHtml(companionInput),
      });
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'state_change',
        targetType: 'Subscription',
        targetId: subscriptionId,
        metadata: {
          event: 'subscription_confirmation_email_sent',
          audience: 'companion',
          to: companionEmail,
        },
      });
    } catch (err) {
      console.error('[subscription] companion confirmation email failed', {
        to: companionEmail,
        subscriptionId,
        err,
      });
    }
  }
}

