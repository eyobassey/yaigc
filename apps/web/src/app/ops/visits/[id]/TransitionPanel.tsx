import type { VisitState } from '@prisma/client';
import { transitionVisit } from '@/lib/visit';

// 'completed' deliberately omitted - the right next step is to submit the
// post-visit report (via the dedicated CTA on the visit detail), which
// atomically transitions the visit to 'reported'.
const PRIMARY_NEXT: Partial<Record<VisitState, { to: VisitState; label: string }[]>> = {
  scheduled: [{ to: 'confirmed', label: 'Mark confirmed' }],
  confirmed: [{ to: 'en_route', label: 'Mark en route' }],
  en_route: [{ to: 'in_progress', label: 'Mark in progress' }],
  in_progress: [{ to: 'completed', label: 'Mark completed' }],
};

const CANCEL_OPTIONS: { to: VisitState; label: string }[] = [
  { to: 'cancelled_by_family', label: 'Cancel (family)' },
  { to: 'cancelled_by_companion', label: 'Cancel (companion)' },
  { to: 'cancelled_by_operator', label: 'Cancel (us)' },
];

const NO_SHOW_OPTIONS: { to: VisitState; label: string }[] = [
  { to: 'no_show_companion', label: 'No show (companion)' },
  { to: 'no_show_recipient', label: 'No show (recipient)' },
];

const TERMINAL: VisitState[] = [
  'reported',
  'cancelled_by_family',
  'cancelled_by_companion',
  'cancelled_by_operator',
  'no_show_companion',
  'no_show_recipient',
];

export function TransitionPanel({
  visitId,
  currentState,
}: {
  visitId: string;
  currentState: VisitState;
}) {
  // 'completed' has its own dedicated CTA elsewhere (Submit post-visit
  // report), so suppress this panel entirely there to avoid two
  // competing affordances.
  if (currentState === 'completed') return null;

  if (TERMINAL.includes(currentState)) {
    return (
      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
          Visit closed
        </h2>
        <p className="text-stone text-[0.875rem]">
          State <strong>{currentState}</strong> is terminal. No further transitions.
        </p>
      </section>
    );
  }

  const primary = PRIMARY_NEXT[currentState] ?? [];
  const allowCancel = currentState !== 'in_progress';
  const allowNoShow = currentState === 'scheduled' || currentState === 'confirmed' || currentState === 'en_route';

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
        State
      </h2>
      <form action={transitionVisit} className="flex flex-col gap-3">
        <input type="hidden" name="visitId" value={visitId} />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
            Note (required for cancel)
          </span>
          <textarea
            name="note"
            rows={2}
            maxLength={2000}
            placeholder="What happened, captured from the phone call."
            className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
          />
        </label>

        <div className="flex flex-col gap-2">
          {primary.map((p) => (
            <button
              key={p.to}
              type="submit"
              name="to"
              value={p.to}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.875rem] font-medium hover:bg-moss-dark transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {allowCancel ? (
          <div className="pt-2 border-t border-moss/10">
            <p className="font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] text-stone mb-2">
              Cancel
            </p>
            <div className="flex flex-col gap-1.5">
              {CANCEL_OPTIONS.map((c) => (
                <button
                  key={c.to}
                  type="submit"
                  name="to"
                  value={c.to}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-terracotta/40 text-terracotta text-[0.8125rem] font-medium hover:bg-terracotta hover:text-cream transition-colors"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {allowNoShow ? (
          <div className="pt-2 border-t border-moss/10">
            <p className="font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] text-stone mb-2">
              No show
            </p>
            <div className="flex flex-col gap-1.5">
              {NO_SHOW_OPTIONS.map((n) => (
                <button
                  key={n.to}
                  type="submit"
                  name="to"
                  value={n.to}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-stone/40 text-stone text-[0.8125rem] font-medium hover:bg-stone hover:text-cream transition-colors"
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </form>
    </section>
  );
}
