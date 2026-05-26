'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import type { UserRole } from '@prisma/client';
import { logInterview, type LogInterviewState } from '@/lib/companion-interview';

type Kind = 'phone_screen' | 'in_person' | 'final';
type Recommendation = 'proceed' | 'second_interview' | 'decline' | 'accept';

const initial: LogInterviewState = { ok: false };

const KIND_OPTIONS: { value: Kind; label: string; description: string }[] = [
  {
    value: 'phone_screen',
    label: 'Phone screen',
    description: 'First conversation. Reading for warmth, availability, and red flags.',
  },
  {
    value: 'in_person',
    label: 'In person',
    description: 'Café interview. Reading the room, cultural fit, the texture of the answers.',
  },
  {
    value: 'final',
    label: 'Final sign-off',
    description: 'Operator_admin only. Promotes the application toward vetting.',
  },
];

const RECOMMENDATION_OPTIONS: { value: Recommendation; label: string; description: string }[] = [
  {
    value: 'proceed',
    label: 'Proceed',
    description: 'Move on to the next interview in the pipeline.',
  },
  {
    value: 'second_interview',
    label: 'Second interview',
    description:
      'Cultural fit is a judgement call. Bring in a second pair of eyes (ideally a different operator) before deciding.',
  },
  {
    value: 'decline',
    label: 'Decline',
    description: 'Stop the pipeline for this applicant.',
  },
  {
    value: 'accept',
    label: 'Accept',
    description: 'Final-only. Promote the application toward vetting.',
  },
];

// Soft Likert bands for the three behavioural cultural-fit dimensions.
const RUBRIC_BAND: { value: string; label: string }[] = [
  { value: '', label: 'Not formed a view' },
  { value: 'strong', label: 'Strong' },
  { value: 'present', label: 'Present' },
  { value: 'unclear', label: 'Unclear' },
  { value: 'absent', label: 'Absent' },
];

const UK_SETTLEDNESS: { value: string; label: string }[] = [
  { value: '', label: 'Not formed a view' },
  { value: 'five_plus', label: 'Five or more years in the UK' },
  { value: 'three_to_five', label: 'Three to five years' },
  { value: 'under_three', label: 'Under three years' },
  { value: 'unclear', label: 'Unclear from the conversation' },
  { value: 'n_a', label: 'Not applicable' },
];

const MOTIVATION: { value: string; label: string }[] = [
  { value: '', label: 'Not formed a view' },
  { value: 'clear', label: 'Clearly motivated beyond income' },
  { value: 'mixed', label: 'Mixed - money matters but not the whole story' },
  { value: 'primarily_financial', label: 'Primarily financial' },
];

const VETTING: { value: string; label: string }[] = [
  { value: '', label: 'Not formed a view' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'not_taken_yet', label: 'Not taken yet' },
];

const COMFORT: { value: string; label: string }[] = [
  { value: '', label: 'Not formed a view' },
  { value: 'yes', label: 'Yes' },
  { value: 'concerns', label: 'Concerns to talk through' },
  { value: 'no', label: 'No' },
];

interface PhaseZero {
  motivation: string | null;
  experienceAlongside: string | null;
  yearsSettledLocally: string | null;
  weeklyStabilityNote: string | null;
  whyJoinReason: string;
  aboutYou: string;
}

interface SecondInterviewGuard {
  priorCount: number;
  onlyOneOperatorSoFar: boolean;
  currentOperatorAlsoInterviewed: boolean;
}

export function LogInterviewForm({
  applicationId,
  operatorRole,
  defaultKind,
  defaultHappenedAt,
  phaseZero,
  secondInterviewGuard,
}: {
  applicationId: string;
  operatorRole: UserRole;
  defaultKind: Kind;
  defaultHappenedAt: string;
  phaseZero: PhaseZero;
  secondInterviewGuard: SecondInterviewGuard;
}) {
  const [state, action] = useFormState(logInterview, initial);
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [recommendation, setRecommendation] = useState<Recommendation | ''>('');

  const isAdmin = operatorRole === 'operator_admin';
  // T.5 - surface the soft warning when the recommendation is decline
  // AND the prior interview history is thin (≤1 interview, by one
  // operator, possibly the same one logging now).
  const showSecondInterviewWarning =
    recommendation === 'decline' &&
    (secondInterviewGuard.priorCount <= 1 ||
      (secondInterviewGuard.onlyOneOperatorSoFar &&
        secondInterviewGuard.currentOperatorAlsoInterviewed));

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="applicationId" value={applicationId} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <PhaseZeroPanel phaseZero={phaseZero} />

      <Section title="Interview">
        <RadioGroup
          name="kind"
          legend="Kind"
          options={KIND_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
            description: o.description,
            disabled: o.value === 'final' && !isAdmin,
          }))}
          value={kind}
          onChange={(v) => setKind(v as Kind)}
          error={state.errors?.kind}
        />
        <Field
          name="happenedAt"
          label="When"
          type="datetime-local"
          defaultValue={state.values?.happenedAt ?? defaultHappenedAt}
          required
          error={state.errors?.happenedAt}
        />
      </Section>

      <Section
        title="Cultural-fit dimensions"
        description="Leave any band blank if you have not formed a view. Bands help future operators get oriented; the narrative is what carries weight."
      >
        <Select
          name="ukSettledness"
          label="Settled life in the UK"
          options={UK_SETTLEDNESS}
          defaultValue={state.values?.ukSettledness}
        />
        <Select
          name="communityTemperament"
          label="Community-driven temperament"
          options={RUBRIC_BAND}
          defaultValue={state.values?.communityTemperament}
          hint="History of being alongside friends, family, or neighbours without rushing them."
        />
        <Select
          name="readsARoom"
          label="Reads a room"
          options={RUBRIC_BAND}
          defaultValue={state.values?.readsARoom}
          hint="Warmth, comfort with silence, awareness of the other person's pace."
        />
        <Select
          name="schedulingStability"
          label="Scheduling stability"
          options={RUBRIC_BAND}
          defaultValue={state.values?.schedulingStability}
          hint="Can hold a weekly visit at the same time for at least six months."
        />
        <Select
          name="motivationBeyondIncome"
          label="Motivation beyond income"
          options={MOTIVATION}
          defaultValue={state.values?.motivationBeyondIncome}
          hint="Money is meaningful but should not be the whole story."
        />
      </Section>

      <Section
        title="Vetting gates"
        description="The harder yes/no questions. Use 'not taken yet' when the check has not happened (DBS still in flight, references not chased)."
      >
        <Select
          name="dbsClearable"
          label="DBS clearable"
          options={VETTING}
          defaultValue={state.values?.dbsClearable}
        />
        <Select
          name="referencesPositive"
          label="References positive"
          options={VETTING}
          defaultValue={state.values?.referencesPositive}
        />
        <Select
          name="engagementTermsComfort"
          label="Comfortable with the engagement terms"
          options={COMFORT}
          defaultValue={state.values?.engagementTermsComfort}
        />
        <Select
          name="trainingAcceptance"
          label="Accepts the training requirement"
          options={COMFORT}
          defaultValue={state.values?.trainingAcceptance}
        />
      </Section>

      <Section title="Narrative">
        <p className="text-stone text-[0.875rem] leading-[1.55]">
          A short description of how the conversation went. Texture, not score.
          What stood out, what gave you pause, what feels right.
        </p>
        <textarea
          name="notes"
          rows={8}
          required
          minLength={20}
          maxLength={4000}
          defaultValue={state.values?.notes}
          className="w-full px-3 py-2 rounded-md border border-moss/15 bg-cream text-charcoal text-[0.9375rem] leading-[1.55] focus:outline-none focus:ring-2 focus:ring-moss/30"
        />
        {state.errors?.notes ? (
          <p className="text-terracotta text-[0.8125rem]">{state.errors.notes}</p>
        ) : null}
      </Section>

      <Section title="Recommendation">
        <RadioGroup
          name="recommendation"
          legend=""
          options={RECOMMENDATION_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
            description: o.description,
            disabled: o.value === 'accept' && kind !== 'final',
          }))}
          value={recommendation}
          onChange={(v) => setRecommendation(v as Recommendation)}
          error={state.errors?.recommendation}
        />
        {showSecondInterviewWarning ? (
          <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.875rem] leading-[1.55]">
            Cultural fit is a judgement call. Consider a second interview with a
            different operator before declining - one operator's read should not
            be definitive.
          </div>
        ) : null}
      </Section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href={`/ops/companions/${applicationId}`}
          className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-moss text-moss text-[0.9375rem] font-medium hover:bg-moss/5 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function PhaseZeroPanel({ phaseZero }: { phaseZero: PhaseZero }) {
  const rows: { label: string; body: string | null }[] = [
    { label: 'Why join (legacy field)', body: phaseZero.whyJoinReason },
    { label: 'About you (legacy field)', body: phaseZero.aboutYou },
    { label: 'What brings you to this work', body: phaseZero.motivation },
    {
      label: 'A time alongside someone',
      body: phaseZero.experienceAlongside,
    },
    {
      label: 'How long settled locally',
      body: phaseZero.yearsSettledLocally,
    },
    {
      label: 'Weekly stability over six months',
      body: phaseZero.weeklyStabilityNote,
    },
  ];
  const nonEmpty = rows.filter((r) => r.body && r.body.trim().length > 0);
  if (nonEmpty.length === 0) return null;
  return (
    <section className="bg-cream-deep/40 border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
        From the application
      </h2>
      <dl className="grid grid-cols-1 gap-3 text-[0.9375rem]">
        {nonEmpty.map((r) => (
          <div key={r.label}>
            <dt className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
              {r.label}
            </dt>
            <dd className="text-charcoal whitespace-pre-wrap break-words leading-[1.55]">
              {r.body}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex flex-col gap-4">
      <legend className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone px-2 -ml-2">
        {title}
      </legend>
      {description ? (
        <p className="text-stone text-[0.875rem] leading-[1.55] -mt-2">{description}</p>
      ) : null}
      {children}
    </fieldset>
  );
}

function Field({
  name,
  label,
  type,
  defaultValue,
  required,
  error,
}: {
  name: string;
  label: string;
  type: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-charcoal text-[0.875rem]">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full px-3 py-2 rounded-md border border-moss/15 bg-cream text-charcoal text-[0.9375rem] focus:outline-none focus:ring-2 focus:ring-moss/30"
      />
      {error ? <span className="text-terracotta text-[0.8125rem]">{error}</span> : null}
    </label>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-charcoal text-[0.875rem]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ''}
        className="w-full px-3 py-2 rounded-md border border-moss/15 bg-cream text-charcoal text-[0.9375rem] focus:outline-none focus:ring-2 focus:ring-moss/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <span className="text-stone text-[0.75rem] leading-[1.5]">{hint}</span> : null}
    </label>
  );
}

function RadioGroup({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string; description: string; disabled?: boolean }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {legend ? (
        <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
          {legend}
        </span>
      ) : null}
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex items-start gap-3 ${
            o.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            disabled={o.disabled}
            onChange={(e) => onChange(e.target.value)}
            required
            className="mt-1.5 accent-moss"
          />
          <span className="flex-1">
            <span className="font-head text-moss text-[1rem] font-medium block">
              {o.label}
            </span>
            <span className="text-charcoal text-[0.875rem] leading-[1.55]">
              {o.description}
            </span>
          </span>
        </label>
      ))}
      {error ? <p className="text-terracotta text-[0.8125rem]">{error}</p> : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-moss text-cream text-[0.9375rem] font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving…' : 'Save interview'}
    </button>
  );
}
