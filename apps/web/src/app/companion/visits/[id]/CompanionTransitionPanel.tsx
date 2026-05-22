'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { VisitState } from '@prisma/client';
import { transitionVisitByCompanion } from '@/lib/visit';

// Companion-facing state-machine panel. Buttons differ per state. A
// cancel reason note is required when cancelling; we toggle a textarea
// reveal so casual taps do not lose the visit.

interface Action {
  to: Exclude<
    VisitState,
    | 'reported'
    | 'cancelled_by_family'
    | 'cancelled_by_operator'
    | 'no_show_companion'
    | 'no_show_recipient'
  >;
  label: string;
  variant: 'primary' | 'secondary';
}

const NEXT_ACTIONS: Partial<Record<VisitState, Action[]>> = {
  scheduled: [
    { to: 'confirmed', label: 'Confirm - I will be there', variant: 'primary' },
  ],
  confirmed: [
    { to: 'en_route', label: 'On my way', variant: 'primary' },
  ],
  en_route: [
    { to: 'in_progress', label: "I am here · start visit", variant: 'primary' },
  ],
  in_progress: [
    { to: 'completed', label: 'End visit · mark done', variant: 'primary' },
  ],
};

const CAN_CANCEL = new Set<VisitState>(['scheduled', 'confirmed', 'en_route']);

export function CompanionTransitionPanel({
  visitId,
  state,
}: {
  visitId: string;
  state: VisitState;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);

  // Terminal states: completed bridges to the report submission flow;
  // everything else is fully closed.
  if (state === 'completed') {
    return (
      <section className="bg-moss/5 border border-moss/15 rounded-[12px] p-5 sm:p-6">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-moss mb-2">
          Next step
        </h2>
        <p className="text-charcoal text-[0.9375rem] mb-3">
          Visit done. Submit your short note within a few hours - the
          family is expecting it.
        </p>
        <Link
          href={`/companion/visits/${visitId}/report`}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.875rem] font-medium hover:bg-moss-dark transition-colors"
        >
          Submit your note
        </Link>
      </section>
    );
  }

  if (
    state === 'reported' ||
    state === 'cancelled_by_family' ||
    state === 'cancelled_by_companion' ||
    state === 'cancelled_by_operator' ||
    state === 'no_show_companion' ||
    state === 'no_show_recipient'
  ) {
    return (
      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
          Visit closed
        </h2>
        <p className="text-stone text-[0.875rem]">No further actions.</p>
      </section>
    );
  }

  const actions = NEXT_ACTIONS[state] ?? [];
  const showCancel = CAN_CANCEL.has(state);

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
        Drive this visit
      </h2>

      <form action={transitionVisitByCompanion} className="flex flex-col gap-3">
        <input type="hidden" name="visitId" value={visitId} />

        {actions.map((a) => (
          <button
            key={a.to}
            type="submit"
            name="to"
            value={a.to}
            className={`inline-flex items-center justify-center px-4 py-2.5 rounded-md text-[0.9375rem] font-medium transition-colors ${
              a.variant === 'primary'
                ? 'bg-moss text-cream hover:bg-moss-dark'
                : 'border border-moss/30 text-moss hover:bg-moss hover:text-cream'
            }`}
          >
            {a.label}
          </button>
        ))}
      </form>

      {showCancel ? (
        <div className="mt-4 pt-4 border-t border-moss/10">
          {!cancelOpen ? (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="text-terracotta text-[0.875rem] hover:underline"
            >
              I cannot make this visit
            </button>
          ) : (
            <form
              action={transitionVisitByCompanion}
              className="flex flex-col gap-2"
            >
              <input type="hidden" name="visitId" value={visitId} />
              <input type="hidden" name="to" value="cancelled_by_companion" />
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
                  Why - so we can let the family know
                </span>
                <textarea
                  name="note"
                  required
                  minLength={5}
                  maxLength={2000}
                  rows={3}
                  placeholder="Brief reason. The family sees this in the cancellation email; please be kind."
                  className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-terracotta/40 text-terracotta text-[0.8125rem] font-medium hover:bg-terracotta hover:text-cream transition-colors"
                >
                  Confirm cancel
                </button>
                <button
                  type="button"
                  onClick={() => setCancelOpen(false)}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-moss/20 text-moss text-[0.8125rem] font-medium hover:bg-moss/5 transition-colors"
                >
                  Keep the visit
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
