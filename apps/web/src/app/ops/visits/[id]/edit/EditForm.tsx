'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { editVisit, type EditVisitState } from '@/lib/visit';
import { Field, TextArea, Section, Select } from '@/app/ops/_components/EditField';

const DURATION_OPTIONS = [
  { value: '60', label: '1 hour' },
  { value: '90', label: '90 minutes' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
];

const initial: EditVisitState = { ok: false };

export function EditForm({
  visitId,
  defaultDate,
  defaultTime,
  defaultDurationMinutes,
  defaultAgreedActivity,
  defaultSafetyFlags,
  defaultSecondaryCompanionId,
  cover,
}: {
  visitId: string;
  defaultDate: string;
  defaultTime: string;
  defaultDurationMinutes: number;
  defaultAgreedActivity: string | null;
  defaultSafetyFlags: string | null;
  defaultSecondaryCompanionId: string | null;
  cover: { id: string; firstName: string; lastName: string } | null;
}) {
  const [state, action] = useFormState(editVisit, initial);
  const coverOptions = cover
    ? [
        { value: '', label: 'No cover present on this visit' },
        { value: cover.id, label: `${cover.firstName} ${cover.lastName} (named cover)` },
      ]
    : null;

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="visitId" value={visitId} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section
        title="Schedule"
        description="UK local time. Both sides get a 'visit moved' email when this changes."
      >
        <Field
          name="scheduledDate"
          label="Date"
          type="date"
          required
          defaultValue={state.values?.scheduledDate ?? defaultDate}
          error={state.errors?.scheduledDate}
        />
        <Field
          name="scheduledTime"
          label="Start time"
          type="time"
          required
          defaultValue={state.values?.scheduledTime ?? defaultTime}
          error={state.errors?.scheduledTime}
        />
        <Select
          name="scheduledDurationMinutes"
          label="Duration"
          required
          options={DURATION_OPTIONS}
          defaultValue={
            state.values?.scheduledDurationMinutes ?? String(defaultDurationMinutes)
          }
          error={state.errors?.scheduledDurationMinutes}
        />
      </Section>

      <Section
        title="Plan + safety"
        description="Per-visit overrides. Editing these does not email."
      >
        <TextArea
          name="agreedActivity"
          label="What is planned"
          rows={3}
          defaultValue={state.values?.agreedActivity ?? defaultAgreedActivity ?? undefined}
          error={state.errors?.agreedActivity}
          hint="Coffee and crossword, a walk, a film, a phone call to the grandkids."
        />
        <TextArea
          name="safetyFlags"
          label="Safety flags"
          rows={3}
          defaultValue={state.values?.safetyFlags ?? defaultSafetyFlags ?? undefined}
          error={state.errors?.safetyFlags}
          hint="Anything specific to this visit. Persistent things go on the recipient record."
        />
      </Section>

      {coverOptions ? (
        <Section
          title="Cover companion"
          description="Mark this visit as one where the named cover is present alongside the primary. The cover does not file a separate report; the primary's report stands."
        >
          <Select
            name="secondaryCompanionId"
            label="Cover present on this visit"
            options={coverOptions}
            defaultValue={
              state.values?.secondaryCompanionId ?? defaultSecondaryCompanionId ?? ''
            }
            error={state.errors?.secondaryCompanionId}
          />
        </Section>
      ) : (
        <input
          type="hidden"
          name="secondaryCompanionId"
          value={defaultSecondaryCompanionId ?? ''}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href={`/ops/visits/${visitId}`}
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
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}
