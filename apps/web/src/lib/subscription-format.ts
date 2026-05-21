// Sync helpers for rendering Subscription data. Kept separate from the
// server-action module so they can be imported by both server components
// and client components.

export const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Every week',
  biweekly: 'Every two weeks',
  monthly: 'Every month',
};

export function summariseSubscription(sub: {
  frequency: string;
  dayOfWeek: string;
  startTime: string;
  durationMinutes: number;
  hourlyRate: { toString(): string } | string | number;
}): string {
  const rate =
    typeof sub.hourlyRate === 'object'
      ? Number(sub.hourlyRate.toString()).toFixed(2)
      : Number(sub.hourlyRate).toFixed(2);
  const dur = sub.durationMinutes;
  const durLabel = dur % 60 === 0 ? `${dur / 60}h` : `${dur} min`;
  return `${FREQUENCY_LABELS[sub.frequency] ?? sub.frequency}, ${DAY_LABELS[sub.dayOfWeek] ?? sub.dayOfWeek} at ${sub.startTime} · ${durLabel} · £${rate}/hr`;
}
