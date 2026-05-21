'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  approveCompanionApplication,
  type ApproveState,
} from '@/lib/companion';
import {
  Field,
  Select,
  TextArea,
  Section,
} from '@/app/ops/_components/EditField';

const initial: ApproveState = { ok: false };

const BOROUGHS = [
  { value: 'south_manchester', label: 'South Manchester' },
  { value: 'trafford', label: 'Trafford' },
  { value: 'stockport', label: 'Stockport' },
  { value: 'salford', label: 'Salford' },
] as const;

const ENGAGEMENTS = [
  { value: 'worker', label: 'Worker (s.230(3)(b) Employment Rights Act)' },
  { value: 'self_employed', label: 'Self-employed contractor' },
  { value: 'employed', label: 'Employed' },
] as const;

export function ApproveForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useFormState(approveCompanionApplication, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="applicationId" value={applicationId} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Working area">
        <Select
          name="borough"
          label="Borough"
          required
          options={BOROUGHS}
          defaultValue=""
          error={state.errors?.borough}
        />
      </Section>

      <Section title="Engagement and pay">
        <Select
          name="engagementType"
          label="Engagement type"
          required
          options={ENGAGEMENTS}
          defaultValue="worker"
          error={state.errors?.engagementType}
        />
        <Field
          name="hourlyRate"
          type="number"
          label="Hourly rate (£)"
          required
          defaultValue="12.00"
          hint="Companion's pay rate per hour. The customer-facing rate is separate (configured globally)."
          error={state.errors?.hourlyRate}
        />
      </Section>

      <Section title="Public bio (optional)">
        <TextArea
          name="bio"
          label="Three short paragraphs"
          rows={6}
          hint="Family-facing. Who they are, what they enjoy, why they joined. The operator can edit later."
          error={state.errors?.bio}
        />
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-moss text-cream text-[0.9375rem] font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Creating Companion…' : 'Approve and create Companion'}
    </button>
  );
}
