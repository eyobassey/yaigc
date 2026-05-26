'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser, isOperator } from '@/lib/auth-helpers';

// SDD Addendum §3.3 - operator records a structured read at the end
// of an interview. Cultural-fit dimensions use Likert words rather
// than numeric scores so the rubric reads as a judgement aid, not an
// assessment. Harder gates (DBS, references, engagement-terms,
// training) are the existing pre-onboarding checks given an explicit
// home on the rubric.

const NOTES_MIN = 20;
const NOTES_MAX = 4000;

const RubricBand = z.enum(['strong', 'present', 'unclear', 'absent']);
const UkSettledness = z.enum([
  'unclear',
  'five_plus',
  'three_to_five',
  'under_three',
  'n_a',
]);
const MotivationBand = z.enum(['clear', 'mixed', 'primarily_financial']);
const VettingState = z.enum(['yes', 'no', 'unknown', 'not_taken_yet']);
const ComfortBand = z.enum(['yes', 'concerns', 'no']);

const LogSchema = z.object({
  applicationId: z.string().min(1),
  kind: z.enum(['phone_screen', 'in_person', 'final']),
  happenedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Use the date + time picker.'),
  notes: z
    .string()
    .trim()
    .min(NOTES_MIN, 'Write a short narrative of the conversation.')
    .max(NOTES_MAX),
  recommendation: z.enum(['proceed', 'second_interview', 'decline', 'accept']),

  ukSettledness: UkSettledness.optional(),
  communityTemperament: RubricBand.optional(),
  readsARoom: RubricBand.optional(),
  schedulingStability: RubricBand.optional(),
  motivationBeyondIncome: MotivationBand.optional(),

  dbsClearable: VettingState.optional(),
  referencesPositive: VettingState.optional(),
  engagementTermsComfort: ComfortBand.optional(),
  trainingAcceptance: ComfortBand.optional(),
});

export type LogInterviewState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function logInterview(
  _prev: LogInterviewState,
  formData: FormData,
): Promise<LogInterviewState> {
  const actor = await getSessionUser();
  if (!actor) return { ok: false, errors: { _form: 'Sign in first.' } };
  if (!isOperator(actor.role)) {
    return { ok: false, errors: { _form: 'Only operators can log an interview.' } };
  }

  const raw: Record<string, string | undefined> = {
    applicationId: String(formData.get('applicationId') ?? ''),
    kind: String(formData.get('kind') ?? ''),
    happenedAt: String(formData.get('happenedAt') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    recommendation: String(formData.get('recommendation') ?? ''),
    ukSettledness: String(formData.get('ukSettledness') ?? '') || undefined,
    communityTemperament: String(formData.get('communityTemperament') ?? '') || undefined,
    readsARoom: String(formData.get('readsARoom') ?? '') || undefined,
    schedulingStability: String(formData.get('schedulingStability') ?? '') || undefined,
    motivationBeyondIncome: String(formData.get('motivationBeyondIncome') ?? '') || undefined,
    dbsClearable: String(formData.get('dbsClearable') ?? '') || undefined,
    referencesPositive: String(formData.get('referencesPositive') ?? '') || undefined,
    engagementTermsComfort: String(formData.get('engagementTermsComfort') ?? '') || undefined,
    trainingAcceptance: String(formData.get('trainingAcceptance') ?? '') || undefined,
  };

  const parsed = LogSchema.safeParse(raw);
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

  // Soft gate per scoping: only operator_admin signs off a final
  // interview - the kind that promotes the application to vetting.
  if (d.kind === 'final' && actor.role !== 'operator_admin') {
    return {
      ok: false,
      errors: { kind: 'Only an operator_admin can log a final sign-off interview.' },
      values: raw,
    };
  }

  const app = await prisma.companionApplication.findUnique({
    where: { id: d.applicationId },
    select: { id: true, deletedAt: true },
  });
  if (!app || app.deletedAt) {
    return { ok: false, errors: { _form: 'Application not found.' }, values: raw };
  }

  // Parse the local datetime as UK wall-clock so the operator picks
  // the time they ran the call in, not UTC.
  const happenedAt = parseUkLocalDateTime(d.happenedAt);
  if (!happenedAt) {
    return { ok: false, errors: { happenedAt: 'Invalid date or time.' }, values: raw };
  }

  const created = await prisma.companionInterview.create({
    data: {
      companionApplicationId: d.applicationId,
      kind: d.kind,
      happenedAt,
      interviewerOperatorId: actor.id,
      notes: d.notes,
      recommendation: d.recommendation,
      ukSettledness: d.ukSettledness ?? null,
      communityTemperament: d.communityTemperament ?? null,
      readsARoom: d.readsARoom ?? null,
      schedulingStability: d.schedulingStability ?? null,
      motivationBeyondIncome: d.motivationBeyondIncome ?? null,
      dbsClearable: d.dbsClearable ?? null,
      referencesPositive: d.referencesPositive ?? null,
      engagementTermsComfort: d.engagementTermsComfort ?? null,
      trainingAcceptance: d.trainingAcceptance ?? null,
    },
    select: { id: true },
  });

  await audit({
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionType: 'create',
    targetType: 'CompanionInterview',
    targetId: created.id,
    afterState: {
      applicationId: d.applicationId,
      kind: d.kind,
      happenedAt: happenedAt.toISOString(),
      recommendation: d.recommendation,
    },
    metadata: {
      event: 'companion_interview_logged',
      kind: d.kind,
      recommendation: d.recommendation,
    },
  });

  revalidatePath(`/ops/companions/${d.applicationId}`);
  redirect(`/ops/companions/${d.applicationId}`);
}

// Map a "YYYY-MM-DDTHH:MM" local-time string (as produced by <input
// type="datetime-local">) to a Date interpreted as UK wall-clock. We
// reuse the same helper logic the visit edit form already trusts:
// derive the local DateTimeFormat parts for UTC, then offset back.
function parseUkLocalDateTime(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const dy = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  // Two-step conversion: build the candidate in UTC, then find the
  // UK offset at that instant and subtract.
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
