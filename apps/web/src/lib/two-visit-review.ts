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
  // V.3 - per-channel operator notes from the structured debrief
  // calls. All optional; the operator may capture one, two, three, or
  // none, depending on which channels reached the recipient this round.
  companionCallNotes: z.string().max(NOTE_MAX).optional(),
  familyCallNotes: z.string().max(NOTE_MAX).optional(),
  recipientCallNotes: z.string().max(NOTE_MAX).optional(),
  // Optional: when did the operator speak with the recipient directly?
  // YYYY-MM-DDTHH:MM, UK local-wall-clock, parsed via the same helper
  // used by the interview rubric.
  recipientCalledAt: z.string().optional(),
});

export type CompleteTwoVisitReviewState = {
  ok: boolean;
  error?: string;
  values?: {
    outcome?: string;
    notes?: string;
    companionCallNotes?: string;
    familyCallNotes?: string;
    recipientCallNotes?: string;
    recipientCalledAt?: string;
  };
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
    companionCallNotes:
      String(formData.get('companionCallNotes') ?? '').trim() || undefined,
    familyCallNotes:
      String(formData.get('familyCallNotes') ?? '').trim() || undefined,
    recipientCallNotes:
      String(formData.get('recipientCallNotes') ?? '').trim() || undefined,
    recipientCalledAt:
      String(formData.get('recipientCalledAt') ?? '').trim() || undefined,
  };
  const parsed = CompleteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Could not save the review.',
      values: {
        outcome: raw.outcome,
        notes: raw.notes,
        companionCallNotes: raw.companionCallNotes,
        familyCallNotes: raw.familyCallNotes,
        recipientCallNotes: raw.recipientCallNotes,
        recipientCalledAt: raw.recipientCalledAt,
      },
    };
  }
  const {
    matchId,
    outcome,
    notes,
    companionCallNotes,
    familyCallNotes,
    recipientCallNotes,
    recipientCalledAt,
  } = parsed.data;
  const recipientCalledAtDate = recipientCalledAt
    ? parseUkLocalDateTime(recipientCalledAt)
    : null;

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
      twoVisitReviewCompanionCallNotes: companionCallNotes ?? null,
      twoVisitReviewFamilyCallNotes: familyCallNotes ?? null,
      twoVisitReviewRecipientCallNotes: recipientCallNotes ?? null,
      twoVisitReviewRecipientCalledAt: recipientCalledAtDate,
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
      channels: {
        companionCall: Boolean(companionCallNotes),
        familyCall: Boolean(familyCallNotes),
        recipientCall: Boolean(recipientCallNotes || recipientCalledAtDate),
      },
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

// Same helper used by the interview rubric (Stage T.2). Parses
// "YYYY-MM-DDTHH:MM" local-time strings from <input type="datetime-local">
// as UK wall-clock and returns a Date in UTC.
function parseUkLocalDateTime(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const dy = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  const candidate = new Date(Date.UTC(y, mo - 1, dy, hh, mm));
  const ukParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(candidate);
  const lookup: Record<string, string> = {};
  for (const p of ukParts) lookup[p.type] = p.value;
  const ukAsUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    lookup.hour === '24' ? 0 : Number(lookup.hour),
    Number(lookup.minute),
  );
  const offsetMs = ukAsUtc - candidate.getTime();
  return new Date(candidate.getTime() - offsetMs);
}
