'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { endMatch, type EndMatchState } from '@/lib/match';
import { Section, TextArea } from '@/app/ops/_components/EditField';

const REASONS = [
  { value: 'not_a_fit', label: 'Not the right fit', hint: 'Chemistry did not click.' },
  { value: 'scheduling_conflict', label: 'Scheduling no longer works', hint: 'Cannot reconcile the rhythm.' },
  {
    value: 'recipient_circumstances_changed',
    label: "Recipient's circumstances have changed",
    hint: 'Move, hospitalisation, family decision.',
  },
  {
    value: 'recipient_passed_away',
    label: 'Recipient has passed away',
    hint: 'Email tone shifts. We will send a sympathy note.',
  },
  {
    value: 'companion_circumstances_changed',
    label: 'Companion is no longer available',
    hint: 'Moving, time off, leaving the platform.',
  },
  {
    value: 'safeguarding_concern',
    label: 'Safeguarding concern',
    hint: 'Logged for the safeguarding team. The email tone is intentionally brief.',
  },
  { value: 'other', label: 'Other', hint: 'Note required below.' },
];

const initial: EndMatchState = { ok: false };

export function EndForm({ matchId }: { matchId: string }) {
  const [state, action] = useFormState(endMatch, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="matchId" value={matchId} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Reason">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Reason for ending the match</legend>
          {REASONS.map((r) => (
            <label
              key={r.value}
              htmlFor={`reason-${r.value}`}
              className="flex items-start gap-3 cursor-pointer text-charcoal text-[0.9375rem] leading-[1.4] p-3 rounded-md border border-moss/10 hover:border-moss/30 hover:bg-cream-deep/40 transition-colors has-[:checked]:border-moss has-[:checked]:bg-moss/5"
            >
              <input
                id={`reason-${r.value}`}
                type="radio"
                name="endReason"
                value={r.value}
                defaultChecked={state.values?.endReason === r.value}
                required
                className="mt-0.5 w-4 h-4 text-moss focus:ring-moss/30 flex-shrink-0"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{r.label}</span>
                <span className="text-stone text-[0.8125rem]">{r.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {state.errors?.endReason ? (
          <p className="text-terracotta text-[0.8125rem]">{state.errors.endReason}</p>
        ) : null}
      </Section>

      <Section
        title="Note (internal)"
        description="Stays in the audit log. Not sent to the family or the companion. If specific words need to be shared, phone them."
      >
        <TextArea
          name="endNote"
          label="What happened, in your own words"
          rows={4}
          defaultValue={state.values?.endNote}
          error={state.errors?.endNote}
        />
      </Section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href={`/ops/matches/${matchId}`}
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
      className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-terracotta text-cream text-[0.9375rem] font-medium hover:bg-terracotta-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Ending…' : 'End this match'}
    </button>
  );
}
