// Shared list of common interest tags for the recipient edit form.
// Kept in code (not @igc/content) because it is fixed UI taxonomy
// rather than brand copy. Adding a tag here makes it available as a
// checkbox; the underlying Recipient.interests column stays a single
// text field, so we never migrate data.
//
// Storage format: items are joined with "; " in display order:
//   ticked canonical tags first, then the free-text 'other' content
//   verbatim. Re-editing splits on "; " and walks the list:
//   anything matching (case-insensitive) a canonical tag becomes a
//   tick, everything else falls into Other.

export const CANONICAL_INTERESTS = [
  'Reading',
  'Gardening',
  'Music',
  'Television and films',
  'Crosswords and puzzles',
  'Cooking and baking',
  'Walking outdoors',
  'Family history and photos',
  'News and current affairs',
  'Sport',
  'Arts and crafts',
  'Faith',
  'Travel stories',
  'Pets and animals',
] as const;

export type CanonicalInterest = (typeof CANONICAL_INTERESTS)[number];

export function tagToFormKey(tag: string): string {
  // Stable form-input key for each checkbox. Lowercase, no diacritics,
  // alnum only.
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Parse a stored interests string into pre-ticked checkboxes plus the
 * leftover free-text. Used to populate the edit form.
 */
export function parseStoredInterests(value: string | null | undefined): {
  selectedTags: Set<string>;
  other: string;
} {
  const selectedTags = new Set<string>();
  if (!value) return { selectedTags, other: '' };

  const lowerCanonical = new Map<string, string>(
    CANONICAL_INTERESTS.map((t) => [t.toLowerCase(), t]),
  );
  const parts = value.split(/;\s*/).map((p) => p.trim()).filter(Boolean);
  const leftover: string[] = [];
  for (const p of parts) {
    const hit = lowerCanonical.get(p.toLowerCase());
    if (hit) {
      selectedTags.add(hit);
    } else {
      leftover.push(p);
    }
  }
  return { selectedTags, other: leftover.join('; ') };
}

/**
 * Inverse of parseStoredInterests: build the canonical join string
 * from a set of ticked tags and the Other textarea content.
 */
export function serialiseInterests(
  selectedTags: Iterable<string>,
  other: string | null | undefined,
): string {
  const ticks = Array.from(selectedTags).filter((t) =>
    (CANONICAL_INTERESTS as readonly string[]).includes(t),
  );
  const otherTrim = (other ?? '').trim();
  const parts = [...ticks];
  if (otherTrim) parts.push(otherTrim);
  return parts.join('; ');
}
