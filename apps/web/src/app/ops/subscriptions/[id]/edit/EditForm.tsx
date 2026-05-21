'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { editSubscription, type EditSubscriptionState } from '@/lib/subscription';
import { Field, Select, TextArea, Section } from '@/app/ops/_components/EditField';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Every month' },
];

const DAY_OPTIONS = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

const DURATION_OPTIONS = [
  { value: '60', label: '1 hour' },
  { value: '90', label: '90 minutes' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
];

const initial: EditSubscriptionState = { ok: false };

export function EditForm({
  subscriptionId,
  defaultFrequency,
  defaultDayOfWeek,
  defaultStartTime,
  defaultDurationMinutes,
  defaultHourlyRate,
  defaultNotes,
}: {
  subscriptionId: string;
  defaultFrequency: string;
  defaultDayOfWeek: string;
  defaultStartTime: string;
  defaultDurationMinutes: number;
  defaultHourlyRate: string;
  defaultNotes: string | null;
}) {
  const [state, action] = useFormState(editSubscription, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Schedule">
        <Select
          name="frequency"
          label="Frequency"
          required
          options={FREQUENCY_OPTIONS}
          defaultValue={state.values?.frequency ?? defaultFrequency}
          error={state.errors?.frequency}
        />
        <Select
          name="dayOfWeek"
          label="Day of week"
          required
          options={DAY_OPTIONS}
          defaultValue={state.values?.dayOfWeek ?? defaultDayOfWeek}
          error={state.errors?.dayOfWeek}
        />
        <Field
          name="startTime"
          label="Start time"
          type="time"
          required
          defaultValue={state.values?.startTime ?? defaultStartTime}
          error={state.errors?.startTime}
          hint="24-hour, UK local time"
        />
        <Select
          name="durationMinutes"
          label="Duration"
          required
          options={DURATION_OPTIONS}
          defaultValue={
            state.values?.durationMinutes ?? String(defaultDurationMinutes)
          }
          error={state.errors?.durationMinutes}
        />
      </Section>

      <Section title="Rate">
        <Field
          name="hourlyRate"
          label="Hourly rate (£)"
          type="number"
          required
          defaultValue={state.values?.hourlyRate ?? defaultHourlyRate}
          error={state.errors?.hourlyRate}
        />
      </Section>

      <Section title="Notes (optional)">
        <TextArea
          name="notes"
          label="Anything future operators should know"
          rows={3}
          defaultValue={state.values?.notes ?? defaultNotes ?? undefined}
          error={state.errors?.notes}
        />
      </Section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href={`/ops/subscriptions/${subscriptionId}`}
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
