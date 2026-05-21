'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  createSubscription,
  type CreateSubscriptionState,
} from '@/lib/subscription';
import {
  Field,
  Select,
  TextArea,
  Section,
} from '@/app/ops/_components/EditField';

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

const initial: CreateSubscriptionState = { ok: false };

export function CreateForm({
  familyId,
  recipients,
  match,
  companions,
}: {
  familyId: string;
  recipients: { id: string; firstName: string; lastName: string }[];
  match: {
    id: string;
    recipientId: string;
    companion: { id: string; label: string; hourlyRate: string };
  } | null;
  companions: { id: string; label: string; hourlyRate: string }[] | null;
}) {
  const [state, action] = useFormState(createSubscription, initial);

  const defaultHourlyRate =
    state.values?.hourlyRate ?? match?.companion.hourlyRate ?? '12.00';

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="familyId" value={familyId} />
      {match ? (
        <>
          <input type="hidden" name="originatingMatchId" value={match.id} />
          <input type="hidden" name="recipientId" value={match.recipientId} />
          <input type="hidden" name="companionId" value={match.companion.id} />
        </>
      ) : null}

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      {match ? (
        <Section title="People (from the accepted match)">
          <p className="text-charcoal text-[0.9375rem]">
            <strong>{match.companion.label}</strong> visiting a recipient
            from this family.
          </p>
        </Section>
      ) : (
        <Section title="People">
          <Select
            name="recipientId"
            label="Recipient"
            required
            options={recipients.map((r) => ({
              value: r.id,
              label: `${r.firstName} ${r.lastName}`,
            }))}
            defaultValue={
              state.values?.recipientId ??
              (recipients.length === 1 ? recipients[0]?.id : undefined)
            }
            error={state.errors?.recipientId}
          />
          {companions ? (
            <Select
              name="companionId"
              label="Companion"
              required
              options={companions.map((c) => ({ value: c.id, label: c.label }))}
              defaultValue={state.values?.companionId}
              error={state.errors?.companionId}
            />
          ) : null}
        </Section>
      )}

      <Section
        title="Schedule"
        description="Recurring slot the family is paying for. We assume UK local time; daylight savings transitions are handled per-visit later."
      >
        <Select
          name="frequency"
          label="Frequency"
          required
          options={FREQUENCY_OPTIONS}
          defaultValue={state.values?.frequency ?? 'weekly'}
          error={state.errors?.frequency}
        />
        <Select
          name="dayOfWeek"
          label="Day of week"
          required
          options={DAY_OPTIONS}
          defaultValue={state.values?.dayOfWeek ?? 'wed'}
          error={state.errors?.dayOfWeek}
        />
        <Field
          name="startTime"
          label="Start time"
          type="time"
          required
          defaultValue={state.values?.startTime ?? '14:00'}
          error={state.errors?.startTime}
          hint="24-hour, UK local time"
        />
        <Select
          name="durationMinutes"
          label="Duration"
          required
          options={DURATION_OPTIONS}
          defaultValue={state.values?.durationMinutes ?? '120'}
          error={state.errors?.durationMinutes}
        />
      </Section>

      <Section title="Rate">
        <Field
          name="hourlyRate"
          label="Hourly rate (£)"
          type="number"
          required
          defaultValue={defaultHourlyRate}
          error={state.errors?.hourlyRate}
          hint="Companion default is shown; override if this family has a special arrangement."
        />
      </Section>

      <Section title="Notes (optional)">
        <TextArea
          name="notes"
          label="Anything future operators should know about this booking"
          rows={3}
          defaultValue={state.values?.notes}
          error={state.errors?.notes}
        />
      </Section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href={match ? `/ops/matches/${match.id}` : `/ops/families/${familyId}`}
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
      {pending ? 'Creating…' : 'Create subscription'}
    </button>
  );
}
