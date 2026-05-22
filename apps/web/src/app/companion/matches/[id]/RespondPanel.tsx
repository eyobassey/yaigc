'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import {
  respondToMatchByCompanion,
  type CompanionRespondState,
} from '@/lib/match';

const initial: CompanionRespondState = { ok: false };

export function RespondPanel({ matchId }: { matchId: string }) {
  const [state, action] = useFormState(respondToMatchByCompanion, initial);
  const [declineOpen, setDeclineOpen] = useState(false);

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
        Your response
      </h2>

      {state.errors?._form ? (
        <p className="text-terracotta text-[0.8125rem] mb-3">{state.errors._form}</p>
      ) : null}

      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="matchId" value={matchId} />
        <button
          type="submit"
          name="action"
          value="accept"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-md bg-moss text-cream text-[0.9375rem] font-medium hover:bg-moss-dark transition-colors"
        >
          Accept - I am up for this
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-moss/10">
        {!declineOpen ? (
          <button
            type="button"
            onClick={() => setDeclineOpen(true)}
            className="text-terracotta text-[0.875rem] hover:underline"
          >
            I would rather not
          </button>
        ) : (
          <form action={action} className="flex flex-col gap-2">
            <input type="hidden" name="matchId" value={matchId} />
            <input type="hidden" name="action" value="decline" />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
                Tell us why - so we can match you better next time
              </span>
              <textarea
                name="note"
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                placeholder="Brief reason. Stays internal - the family does not see your words."
                className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
              />
              {state.errors?.note ? (
                <span className="text-terracotta text-[0.8125rem]">{state.errors.note}</span>
              ) : null}
            </label>
            <div className="flex flex-wrap gap-2">
              <DeclineButton />
              <button
                type="button"
                onClick={() => setDeclineOpen(false)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-moss/20 text-moss text-[0.8125rem] font-medium hover:bg-moss/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function DeclineButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-terracotta/40 text-terracotta text-[0.8125rem] font-medium hover:bg-terracotta hover:text-cream transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Sending…' : 'Confirm decline'}
    </button>
  );
}
