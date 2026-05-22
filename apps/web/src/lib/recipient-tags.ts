// Generic checkbox-grid + Other pattern for recipient fields whose
// underlying schema is a single text column (interests, mobility,
// dietary). The form lets the family pick from a fixed list and add
// anything else as free text; we serialise as "; "-joined and
// reverse-parse on re-edit. The Recipient schema does not change.
//
// Adding a new tag to any of the canonical lists below makes it
// available as a checkbox immediately; no data migration. Pre-existing
// free-form text falls into the Other textarea on first re-edit.

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

export const CANONICAL_MOBILITY = [
  'Walks unaided',
  'Walks with a stick',
  'Walks with a frame',
  'Wheelchair user',
  'Manages stairs',
  'No stairs',
  'Hard of hearing',
  'Visual impairment',
] as const;

export const CANONICAL_DIETARY = [
  'Vegetarian',
  'Vegan',
  'Halal',
  'Kosher',
  'Gluten-free',
  'Lactose-intolerant',
  'Diabetic',
  'Soft food only',
  'Enjoys a cup of tea',
] as const;

export type TagList = readonly string[];

export function tagToFormKey(tag: string): string {
  // Stable form-input key. Lowercase, no diacritics, alnum + underscore.
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Parse a stored "; "-joined string into pre-ticked checkboxes + the
 * leftover free-text. Items matching the canonical list (case-insensitive)
 * become ticks; everything else falls into Other.
 */
export function parseTagged(
  canonical: TagList,
  value: string | null | undefined,
): {
  selectedTags: Set<string>;
  other: string;
} {
  const selectedTags = new Set<string>();
  if (!value) return { selectedTags, other: '' };

  const lowerCanonical = new Map<string, string>(
    canonical.map((t) => [t.toLowerCase(), t]),
  );
  const parts = value
    .split(/;\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
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
 * Inverse of parseTagged: combine a set of ticks + the Other text
 * back into the "; "-joined string we store.
 */
export function serialiseTagged(
  canonical: TagList,
  selectedTags: Iterable<string>,
  other: string | null | undefined,
): string {
  const canonicalSet = new Set(canonical);
  const ticks = Array.from(selectedTags).filter((t) => canonicalSet.has(t));
  const otherTrim = (other ?? '').trim();
  const parts = [...ticks];
  if (otherTrim) parts.push(otherTrim);
  return parts.join('; ');
}
