// Pure scheduling logic for visits. No DB, no side effects - imported by
// both the server action that generates visits and the formatting helpers
// the UI uses.
//
// All wall-clock times are UK local (Europe/London). All Date values are
// canonical UTC. The Intl.DateTimeFormat-based helper below handles
// BST/GMT correctly without pulling in date-fns-tz.

const DAY_TO_JS: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const FREQ_STEP_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 28, // approximation; calendar-month scheduling is Phase 2
};

/**
 * Return the offset in minutes between Europe/London wall-clock and UTC
 * at a given UTC moment. +60 during BST, 0 during GMT.
 */
function ukOffsetMinutes(atUtc: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(atUtc);
  const lookup: Record<string, string> = {};
  for (const p of parts) lookup[p.type] = p.value;
  const ukAsIfUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour) === 24 ? 0 : Number(lookup.hour),
    Number(lookup.minute),
  );
  return Math.round((ukAsIfUtc - atUtc.getTime()) / 60000);
}

/**
 * Build a canonical UTC Date from a UK-local wall clock.
 *
 * Uses fixed-point iteration to land on the correct offset: at DST
 * boundaries the first guess can be on the wrong side, so we recompute
 * once. The 02:00-03:00 spring-forward gap is ambiguous; we accept the
 * naive answer there (visits at 2am are not a realistic case).
 */
export function ukWallClockToUtc(
  year: number,
  monthIdx: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess1 = new Date(Date.UTC(year, monthIdx, day, hour, minute));
  const offset1 = ukOffsetMinutes(guess1);
  const guess2 = new Date(guess1.getTime() - offset1 * 60000);
  const offset2 = ukOffsetMinutes(guess2);
  // If offset shifted (DST boundary), trust the second guess.
  return offset1 === offset2
    ? guess2
    : new Date(guess1.getTime() - offset2 * 60000);
}

export interface ScheduleSeed {
  frequency: string; // weekly | biweekly | monthly
  dayOfWeek: string; // mon | tue | wed | thu | fri | sat | sun
  startTime: string; // "HH:MM" UK local
  /** Anchor for biweekly/monthly cadence; defaults to subscription start. */
  startedAt: Date;
}

/**
 * Compute the next visit start (UTC) for a Subscription, strictly after
 * the given reference time.
 *
 * For weekly: next dayOfWeek-matching date >= reference, at startTime
 * UK local.
 *
 * For biweekly/monthly: same, but stepped by 14/28 days from the
 * subscription's startedAt anchor so the cadence is stable.
 */
export function nextVisitStart(seed: ScheduleSeed, after: Date): Date {
  const targetDow = DAY_TO_JS[seed.dayOfWeek];
  const step = FREQ_STEP_DAYS[seed.frequency] ?? 7;
  const [hStr, mStr] = seed.startTime.split(':');
  const hour = Number(hStr);
  const minute = Number(mStr);

  // Work in UK local calendar dates so day-of-week and stepping line up
  // with what the family sees.
  const ukParts = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    }).formatToParts(d);
    const o: Record<string, string> = {};
    for (const p of parts) o[p.type] = p.value;
    const wd = (o.weekday ?? 'mon').toLowerCase().slice(0, 3); // "sun","mon",...
    return {
      year: Number(o.year ?? '1970'),
      monthIdx: Number(o.month ?? '1') - 1,
      day: Number(o.day ?? '1'),
      dow: DAY_TO_JS[wd] ?? 1,
    };
  };

  // Start from the later of (anchor, after).
  const anchorParts = ukParts(seed.startedAt);
  const afterParts = ukParts(after);

  // Find the first dayOfWeek match on or after `after` (or `anchor` if
  // it's later).
  const startFrom =
    seed.startedAt.getTime() > after.getTime() ? anchorParts : afterParts;
  let { year, monthIdx, day, dow } = startFrom;

  // Advance day-by-day until we hit targetDow.
  let safety = 0;
  while (dow !== targetDow && safety < 14) {
    const d = new Date(Date.UTC(year, monthIdx, day + 1));
    const p = ukParts(d);
    year = p.year;
    monthIdx = p.monthIdx;
    day = p.day;
    dow = p.dow;
    safety += 1;
  }

  // Candidate at startTime UK local.
  let candidate = ukWallClockToUtc(year, monthIdx, day, hour, minute);

  // For weekly: candidate may equal `after` exactly; we want strict
  // after, so bump a week.
  if (candidate.getTime() <= after.getTime()) {
    const d = new Date(Date.UTC(year, monthIdx, day + step));
    const p = ukParts(d);
    candidate = ukWallClockToUtc(p.year, p.monthIdx, p.day, hour, minute);
  }

  // For biweekly/monthly: ensure the candidate is on a stable cadence
  // from the anchor. If it isn't, step forward by `step` days until it
  // lands an integer multiple of `step` days from the anchor.
  if (step !== 7) {
    const anchorAtMidnightUk = ukWallClockToUtc(
      anchorParts.year,
      anchorParts.monthIdx,
      anchorParts.day,
      0,
      0,
    );
    let safety2 = 0;
    while (safety2 < 100) {
      const candAtMidnightUk = (() => {
        const p = ukParts(candidate);
        return ukWallClockToUtc(p.year, p.monthIdx, p.day, 0, 0);
      })();
      const dayDelta = Math.round(
        (candAtMidnightUk.getTime() - anchorAtMidnightUk.getTime()) /
          (24 * 60 * 60 * 1000),
      );
      if (dayDelta % step === 0) break;
      const p = ukParts(candidate);
      const d = new Date(Date.UTC(p.year, p.monthIdx, p.day + 7));
      const np = ukParts(d);
      candidate = ukWallClockToUtc(
        np.year,
        np.monthIdx,
        np.day,
        hour,
        minute,
      );
      safety2 += 1;
    }
  }

  return candidate;
}

/**
 * Format a Date as a UK local wall-clock string for display.
 */
export function formatUkDateTime(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
}

export function formatUkDate(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(at);
}

export function formatUkTime(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
}

export const VISIT_STATE_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  en_route: 'En route',
  in_progress: 'In progress',
  completed: 'Completed',
  reported: 'Reported',
  cancelled_by_family: 'Cancelled by family',
  cancelled_by_companion: 'Cancelled by companion',
  cancelled_by_operator: 'Cancelled by us',
  no_show_companion: 'No show (companion)',
  no_show_recipient: 'No show (recipient)',
};

export const TERMINAL_VISIT_STATES = new Set([
  'completed',
  'reported',
  'cancelled_by_family',
  'cancelled_by_companion',
  'cancelled_by_operator',
  'no_show_companion',
  'no_show_recipient',
]);
