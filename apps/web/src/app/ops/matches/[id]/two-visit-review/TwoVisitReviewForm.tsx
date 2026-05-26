'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  completeTwoVisitReview,
  type CompleteTwoVisitReviewState,
} from '@/lib/two-visit-review';

const initial: CompleteTwoVisitReviewState = { ok: false };

type Outcome = 'continue' | 'adjust' | 'reset';

const OUTCOMES: { value: Outcome; label: string; description: string }[] = [
  {
    value: 'continue',
    label: 'Continue',
    description: 'The match is working. No changes.',
  },
  {
    value: 'adjust',
    label: 'Adjust',
    description:
      'The match is working but with one or two specific changes, communicated clearly to both sides.',
  },
  {
    value: 'reset',
    label: 'Reset',
    description:
      'The match is not working. The family will be rematched with high priority.',
  },
];

export function TwoVisitReviewForm({
  matchId,
  recipientLabel,
}: {
  matchId: string;
  recipientLabel: string;
}) {
  const [state, action] = useFormState(completeTwoVisitReview, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="matchId" value={matchId} />

      {state.error ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.error}
        </div>
      ) : null}

      <fieldset className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex flex-col gap-3">
        <legend className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone px-2 -ml-2">
          Decision
        </legend>
        <p className="text-stone text-[0.875rem] leading-[1.55]">
          Pick one. Reset triggers the rematching workflow inside 24 hours; both
          continue and adjust keep the current pairing in place.
        </p>
        {OUTCOMES.map((o) => (
          <label
            key={o.value}
            className="flex items-start gap-3 cursor-pointer group"
          >
            <input
              type="radio"
              name="outcome"
              value={o.value}
              required
              defaultChecked={state.values?.outcome === o.value}
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
      </fieldset>

      <fieldset className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex flex-col gap-3">
        <legend className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone px-2 -ml-2">
          Note for both sides
        </legend>
        <p className="text-stone text-[0.875rem] leading-[1.55]">
          A short note that goes out to the family and the companion in
          appropriate language. Stay warm. Avoid scoring or rating; describe
          what is happening and what comes next for {recipientLabel}.
        </p>
        <textarea
          name="notes"
          rows={6}
          required
          minLength={20}
          maxLength={4000}
          defaultValue={state.values?.notes}
          className="w-full px-3 py-2 rounded-md border border-moss/15 bg-cream text-charcoal text-[0.9375rem] leading-[1.55] focus:outline-none focus:ring-2 focus:ring-moss/30"
        />
      </fieldset>

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
      className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-moss text-cream text-[0.9375rem] font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving and emailing…' : 'Save and email both sides'}
    </button>
  );
}
