// Internal companion badges. Two concepts live here:
//
//   1. A live-computed "tier" derived from the number of completed
//      visits. Bronze 5+, Silver 25+, Gold 100+. Not stored - we just
//      count visits at render time. Companies who recompute on every
//      render at this caseload size are still well under a millisecond.
//
//   2. A catalogue of manual descriptive badges that operators attach
//      to a companion via /ops/companions/[id]/edit. Stored in the
//      CompanionBadge table. Designed to feed match scoring later.
//
// Families never see any of this.

export interface BadgeMeta {
  slug: string;
  label: string;
  description?: string;
  group: 'skill' | 'context' | 'language';
}

export const BADGE_CATALOGUE: BadgeMeta[] = [
  // Skills
  { slug: 'drives',                 label: 'Drives',                 group: 'skill' },
  { slug: 'first_aid_trained',      label: 'First-aid trained',      group: 'skill' },
  { slug: 'cooks',                  label: 'Cooks',                  group: 'skill' },
  { slug: 'gardening',              label: 'Gardening',              group: 'skill' },
  { slug: 'tech_helper',            label: 'Tech helper',            group: 'skill' },
  // Context
  { slug: 'dementia_experience',    label: 'Dementia experience',    group: 'context' },
  { slug: 'mobility_aid_experience',label: 'Mobility-aid experience',group: 'context' },
  { slug: 'palliative_experience',  label: 'Palliative experience',  group: 'context' },
  { slug: 'pet_friendly',           label: 'Pet friendly',           group: 'context' },
  { slug: 'smoker_friendly',        label: 'Smoker friendly',        group: 'context' },
  // Language
  { slug: 'lang_spanish',           label: 'Spanish',                group: 'language' },
  { slug: 'lang_urdu',              label: 'Urdu',                   group: 'language' },
  { slug: 'lang_polish',            label: 'Polish',                 group: 'language' },
  { slug: 'lang_punjabi',           label: 'Punjabi',                group: 'language' },
  { slug: 'lang_french',            label: 'French',                 group: 'language' },
  { slug: 'lang_arabic',            label: 'Arabic',                 group: 'language' },
  { slug: 'lang_bsl',               label: 'BSL',                    group: 'language' },
];

export const BADGE_BY_SLUG: Record<string, BadgeMeta> = Object.fromEntries(
  BADGE_CATALOGUE.map((b) => [b.slug, b]),
);

// ----- Tier helpers ---------------------------------------------------

export type CompanionTier = null | 'bronze' | 'silver' | 'gold';

export interface TierView {
  tier: CompanionTier;
  visits: number;
  label: string | null;
}

export function tierFromVisits(completedVisits: number): TierView {
  if (completedVisits >= 100) {
    return { tier: 'gold', visits: completedVisits, label: 'Gold' };
  }
  if (completedVisits >= 25) {
    return { tier: 'silver', visits: completedVisits, label: 'Silver' };
  }
  if (completedVisits >= 5) {
    return { tier: 'bronze', visits: completedVisits, label: 'Bronze' };
  }
  return { tier: null, visits: completedVisits, label: null };
}

export function tierToneClass(tier: CompanionTier): string {
  if (tier === 'gold') return 'bg-[#bf8b2d]/15 text-[#7c5a13] border border-[#bf8b2d]/40';
  if (tier === 'silver') return 'bg-stone/20 text-charcoal border border-stone/40';
  if (tier === 'bronze') return 'bg-terracotta/15 text-terracotta border border-terracotta/40';
  return 'bg-cream-deep text-stone border border-moss/15';
}

// ----- Tenure (descriptive sub-line, not a stored badge) --------------

export function tenureLabel(joinedAt: Date, now: Date = new Date()): string {
  const ms = now.getTime() - joinedAt.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 30) return 'New';
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`;
  const years = Math.floor(months / 12);
  const leftover = months - years * 12;
  if (leftover === 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
  return `${years}y ${leftover}m`;
}
