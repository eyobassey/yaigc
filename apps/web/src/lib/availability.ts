// Structured availability for companion applications + companions.
// Keep this small and shared: form, server action, and operator display
// all consume the same vocabulary.

export const DAYS = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
] as const;

export type DayKey = (typeof DAYS)[number]['key'];

export const PERIODS = [
  { key: 'morning', label: 'Morning', range: '8am – 12pm' },
  { key: 'afternoon', label: 'Afternoon', range: '12pm – 5pm' },
  { key: 'evening', label: 'Evening', range: '5pm – 9pm' },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['key'];

// Persisted shape on Companion.availability and
// CompanionApplication.availabilitySlots.
export type AvailabilitySlots = {
  [day in DayKey]?: PeriodKey[];
} & {
  caveats?: string;
};

const PERIOD_SHORT: Record<PeriodKey, string> = {
  morning: 'AM',
  afternoon: 'PM',
  evening: 'eve',
};

/**
 * Convert structured slots into a one-line operator-friendly summary.
 * "Mon AM, PM | Wed AM | Sat all day"
 */
export function summariseAvailability(slots: AvailabilitySlots): string {
  const parts: string[] = [];
  for (const d of DAYS) {
    const sel = slots[d.key];
    if (!sel || sel.length === 0) continue;
    if (sel.length === 3) {
      parts.push(`${d.short} all day`);
    } else {
      const labels = sel
        .map((p) => PERIOD_SHORT[p])
        .filter(Boolean)
        .join(', ');
      parts.push(`${d.short} ${labels}`);
    }
  }
  const head = parts.length === 0 ? 'No availability set.' : parts.join(' · ');
  return slots.caveats ? `${head}. ${slots.caveats}` : head;
}

/**
 * Read picker checkboxes off a FormData. Field names are
 * `slot_<day>_<period>` (value="on" when checked).
 */
export function parseAvailabilityFormData(
  formData: FormData,
): AvailabilitySlots {
  const out: AvailabilitySlots = {};
  for (const d of DAYS) {
    const picked: PeriodKey[] = [];
    for (const p of PERIODS) {
      if (formData.get(`slot_${d.key}_${p.key}`) === 'on') {
        picked.push(p.key);
      }
    }
    if (picked.length > 0) {
      out[d.key] = picked;
    }
  }
  const caveats = String(formData.get('availabilityCaveats') ?? '').trim();
  if (caveats) out.caveats = caveats;
  return out;
}

export function hasAnyAvailability(slots: AvailabilitySlots): boolean {
  return DAYS.some(({ key }) => (slots[key]?.length ?? 0) > 0);
}

/**
 * Type guard for an unknown value (e.g. Prisma Json column read) that
 * we want to treat as AvailabilitySlots.
 */
function isAvailabilitySlots(v: unknown): v is AvailabilitySlots {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Render structured availability as a list of human-readable lines,
 * one per day. Used by display surfaces (companion profile view) where
 * a vertical list reads more naturally than the one-line summary.
 *
 * Returns an empty array when nothing is selected so callers can show
 * a tailored empty state.
 */
export function renderAvailabilityLines(slots: unknown): string[] {
  if (!isAvailabilitySlots(slots)) return [];
  const lines: string[] = [];
  for (const d of DAYS) {
    const sel = slots[d.key];
    if (!sel || sel.length === 0) continue;
    if (sel.length === 3) {
      lines.push(`${d.label} - all day`);
      continue;
    }
    const labels = sel
      .map((p) => PERIODS.find((pp) => pp.key === p)?.label ?? '')
      .filter((l) => l.length > 0)
      .join(', ');
    lines.push(`${d.label} - ${labels}`);
  }
  if (slots.caveats) lines.push(slots.caveats);
  return lines;
}
