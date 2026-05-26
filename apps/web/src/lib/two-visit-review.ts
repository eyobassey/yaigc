'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser, isOperator } from '@/lib/auth-helpers';
import {
  twoVisitReviewHtml,
  twoVisitReviewText,
  twoVisitReviewSubject,
} from '@/lib/email/two-visit-review';

// SDD Addendum §4. Workflow: the operator reads both post-visit
// reports, makes the two debrief phone calls (family + companion),
// records the outcome + a short note that goes to both sides. On
// outcome=reset, §4.5 says the rematching workflow is triggered with
// high priority - in the build, that surfaces as a banner on the
// match detail page and a "rematch needed" item on the today
// dashboard; the actual end-and-repropose happens through the
// existing match-end + match-propose flows.

const NOTE_MIN = 20;
const NOTE_MAX = 4000;

const CompleteSchema = z.object({
  matchId: z.string().min(1),
  outcome: z.enum(['continue', 'adjust', 'reset']),
  notes: z
    .string()
    .trim()
    .min(NOTE_MIN, 'Write a short note for both sides.')
    .max(NOTE_MAX),
});

export type CompleteTwoVisitReviewState = {
  ok: boolean;
  error?: string;
  values?: { outcome?: string; notes?: string };
};

function buildTransport() {
  return createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
}

export async function completeTwoVisitReview(
  _prev: CompleteTwoVisitReviewState,
  formData: FormData,
): Promise<CompleteTwoVisitReviewState> {
  const actor = await getSessionUser();
  if (!actor) return { ok: false, error: 'Sign in first.' };
  if (!isOperator(actor.role)) {
    return { ok: false, error: 'Only operators can complete a review.' };
  }

  const raw = {
    matchId: String(formData.get('matchId') ?? ''),
    outcome: String(formData.get('outcome') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  };
  const parsed = CompleteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Could not save the review.',
      values: { outcome: raw.outcome, notes: raw.notes },
    };
  }
  const { matchId, outcome, notes } = parsed.data;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      familyId: true,
      twoVisitReviewScheduledFor: true,
      twoVisitReviewCompletedAt: true,
      family: {
        select: {
          id: true,
          members: {
            where: { role: 'payer', deletedAt: null },
            take: 1,
            include: { user: { select: { email: true, firstName: true } } },
          },
        },
      },
      companion: {
        select: {
          firstName: true,
          user: { select: { email: true } },
        },
      },
    },
  });
  if (!match) return { ok: false, error: 'Match not found.' };
  if (!match.twoVisitReviewScheduledFor) {
    return { ok: false, error: 'Two-visit review is not scheduled for this match.' };
  }
  if (match.twoVisitReviewCompletedAt) {
    return { ok: false, error: 'This review is already completed.' };
  }

  const now = new Date();
  await prisma.match.update({
    where: { id: matchId },
    data: {
      twoVisitReviewCompletedAt: now,
      twoVisitReviewOutcome: outcome,
      twoVisitReviewNotes: notes,
      twoVisitReviewByOperatorId: actor.id,
    },
  });

  await audit({
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionType: 'update',
    targetType: 'Match',
    targetId: matchId,
    beforeState: { twoVisitReviewCompletedAt: null },
    afterState: {
      twoVisitReviewCompletedAt: now.toISOString(),
      twoVisitReviewOutcome: outcome,
      twoVisitReviewNotes: notes,
    },
    metadata: {
      event: 'two_visit_review_completed',
      outcome,
      noteLength: notes.length,
    },
  });

  // Best-effort notes to both sides. A transient SMTP hiccup must
  // not roll back the review.
  const payer = match.family.members[0]?.user;
  const companionEmail = match.companion.user?.email ?? null;
  try {
    const transport = buildTransport();
    const tasks: Promise<unknown>[] = [];
    if (payer?.email) {
      const payload = {
        audience: 'family' as const,
        recipientFirstName: payer.firstName ?? null,
        operatorFirstName: actor.firstName ?? null,
        outcome,
        noteBody: notes,
      };
      tasks.push(
        transport.sendMail({
          to: payer.email,
          from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
          subject: twoVisitReviewSubject(payload),
          text: twoVisitReviewText(payload),
          html: twoVisitReviewHtml(payload),
        }),
      );
    }
    if (companionEmail) {
      const payload = {
        audience: 'companion' as const,
        recipientFirstName: match.companion.firstName ?? null,
        operatorFirstName: actor.firstName ?? null,
        outcome,
        noteBody: notes,
      };
      tasks.push(
        transport.sendMail({
          to: companionEmail,
          from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
          subject: twoVisitReviewSubject(payload),
          text: twoVisitReviewText(payload),
          html: twoVisitReviewHtml(payload),
        }),
      );
    }
    await Promise.allSettled(tasks);
  } catch (err) {
    console.error('[two-visit-review] email dispatch failed', { matchId, err });
  }

  revalidatePath('/ops');
  revalidatePath(`/ops/matches/${matchId}`);
  revalidatePath(`/ops/families/${match.familyId}`);
  redirect(`/ops/matches/${matchId}`);
}
