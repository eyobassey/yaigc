import type { VisitState } from '@prisma/client';

// Companion-facing visit state copy. Slightly more operational than the
// family-facing pills - the companion is the one DOING the visit, so
// 'On the way' belongs to them, 'Confirmed' means they tapped confirm.

const LABEL: Record<VisitState, string> = {
  scheduled: 'To confirm',
  confirmed: 'Confirmed',
  en_route: 'On the way',
  in_progress: 'In progress',
  completed: 'Done',
  reported: 'Reported',
  cancelled_by_family: 'Family cancelled',
  cancelled_by_companion: 'You cancelled',
  cancelled_by_operator: 'Operator cancelled',
  no_show_companion: 'No show (you)',
  no_show_recipient: 'No show (recipient)',
};

const TONE: Record<VisitState, string> = {
  scheduled: 'bg-terracotta/15 text-terracotta',
  confirmed: 'bg-moss/15 text-moss',
  en_route: 'bg-terracotta/15 text-terracotta',
  in_progress: 'bg-terracotta/15 text-terracotta',
  completed: 'bg-charcoal/10 text-charcoal',
  reported: 'bg-moss/15 text-moss',
  cancelled_by_family: 'bg-stone/15 text-stone',
  cancelled_by_companion: 'bg-stone/15 text-stone',
  cancelled_by_operator: 'bg-stone/15 text-stone',
  no_show_companion: 'bg-stone/15 text-stone',
  no_show_recipient: 'bg-stone/15 text-stone',
};

export function CompanionVisitStatePill({ state }: { state: VisitState }) {
  return (
    <span
      className={`inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${TONE[state]}`}
    >
      {LABEL[state]}
    </span>
  );
}
