'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { openCaseManually, type OpenCaseState } from '@/lib/safeguarding';
import { Section, Select, TextArea } from '@/app/ops/_components/EditField';

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const initial: OpenCaseState = { ok: false };

export function OpenForm({
  recipients,
}: {
  recipients: { id: string; label: string }[];
}) {
  const [state, action] = useFormState(openCaseManually, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Subject (optional)">
        <Select
          name="subjectRecipientId"
          label="Recipient at the centre of the concern"
          options={[{ value: '', label: '- none -' }, ...recipients.map((r) => ({ value: r.id, label: r.label }))]}
          defaultValue={state.values?.subjectRecipientId ?? ''}
          error={state.errors?.subjectRecipientId}
        />
      </Section>

      <Section title="Severity">
        <Select
          name="severity"
          label="How urgent is this"
          required
          options={SEVERITY_OPTIONS}
          defaultValue={state.values?.severity ?? 'medium'}
          error={state.errors?.severity}
        />
      </Section>

      <Section title="Summary">
        <TextArea
          name="summary"
          label="What is going on"
          required
          rows={5}
          defaultValue={state.values?.summary}
          error={state.errors?.summary}
          hint="A few sentences. Detail goes in the case-note thread once it is open."
        />
      </Section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href="/ops/safeguarding"
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
      {pending ? 'Opening…' : 'Open case'}
    </button>
  );
}
