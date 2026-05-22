# ADR 0006: Internal companion badging — tier + manual tags

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-22 |
| **Deciders** | Bassey Eyo (founder), Engineering (lead) |
| **Affected SDD sections** | §12.6 (Companions), §6.4 (Operator console) |

## Context

Operators wanted a way to label companions in the console — partly to
make matching faster ("we need a Polish speaker", "we need someone who
drives") and partly to surface the right-shape information at the right
moment ("Bronze tier with 12 visits" answers "are they experienced?"
faster than scrolling).

Two flavours of label were on the table:

1. **Tiered** by completed visits. Bronze, Silver, Gold-style. Easy to
   read at a glance.
2. **Descriptive tags** — Drives, Dementia experience, Spanish-speaking.
   Operator-assigned, useful for filtering.

Both have well-known failure modes. Tier schemes can drift into
competitive language that doesn't fit the brand voice. Manual tags
can rot if nobody curates them.

## Decision

**Both, side-by-side, internal-only.**

- **Tier** is derived live from completed visits (no storage):
  - Bronze: 5+ completed visits
  - Silver: 25+
  - Gold: 100+
  - Under 5: a quiet "N visits" sub-line with no pill
- **Manual descriptive tags** are stored in a new `CompanionBadge`
  table with a closed catalogue (`lib/badges.ts`). Operator picks them
  on `/ops/companions/[id]/edit` via a chip-picker grouped by
  Skills / Context / Languages.
- **Tenure** ("12 months", "2y 3m") is computed from
  `Companion.createdAt` and shown inline. Not a stored badge.
- **Families never see any of this.** Tier, badges, and tenure are
  ops-only.

## Catalogue (initial)

| Group | Slug | Label |
|---|---|---|
| Skill | `drives` | Drives |
| Skill | `first_aid_trained` | First-aid trained |
| Skill | `cooks` | Cooks |
| Skill | `gardening` | Gardening |
| Skill | `tech_helper` | Tech helper |
| Context | `dementia_experience` | Dementia experience |
| Context | `mobility_aid_experience` | Mobility-aid experience |
| Context | `palliative_experience` | Palliative experience |
| Context | `pet_friendly` | Pet friendly |
| Context | `smoker_friendly` | Smoker friendly |
| Language | `lang_spanish` | Spanish |
| Language | `lang_urdu` | Urdu |
| Language | `lang_polish` | Polish |
| Language | `lang_punjabi` | Punjabi |
| Language | `lang_french` | French |
| Language | `lang_arabic` | Arabic |
| Language | `lang_bsl` | BSL |

The catalogue is a closed enum in code (`BADGE_CATALOGUE` in
`lib/badges.ts`). New slugs require a code change so the matching
logic and the chip-picker stay in lock-step. Operators can request
new ones; we add them in a small commit.

## Alternatives considered

### Tier-only

- ✅ Simplest possible UI.
- ❌ Doesn't answer "who speaks Urdu" or "who drives".
- ❌ Can drift into competitive language. The mitigation was already
  baked into the label format ("Bronze · 12 visits", not "Top
  performer") but the bigger value is the manual tags.

### Manual tags only

- ✅ Simple model, fully operator-controlled.
- ❌ Doesn't surface tenure or experience at a glance. The office still
  has to scroll the visit history to know how seasoned someone is.

### Open-ended free-text tags

- ✅ Maximum flexibility.
- ❌ Within a month the team will have entered "dementia", "Dementia",
  "Dementia experienced", "dementia exp" four times. Closed catalogue
  is the standard fix.

## Why no auto-earned descriptive badges

Considered "Reliable" (95%+ on-time over the last 20 visits) and
"Always reports" (post-visit report submitted within 24h on the last
10 visits). Deferred for two reasons:

- The data shape isn't ready. We don't track on-time arrival as a
  first-class metric yet (`actualStartAt` exists but isn't compared to
  `scheduledStartAt` anywhere).
- Auto-earned descriptive badges that disappear when behaviour drifts
  are surprising. Worth doing once we have the metrics in place and
  can show the companion what would change the badge.

## Consequences

### Today

- `/ops/companions/[id]` shows the tier pill + tenure beside the
  name, with manual badge chips below.
- `/ops/companions` (the list) shows the same per row, across every
  status filter.
- `editCompanionByOperator` does the reconcile (add/remove deltas)
  inside the same `$transaction` as the row update.

### Tomorrow

- The manual tags become inputs to match scoring once payments unblock
  the next stage of matching work. A "Polish speaker" recipient
  filters to companions with `lang_polish`.
- An ops-facing report ("show me everyone who drives in Trafford")
  becomes one query against `CompanionBadge`.

### When to revisit

- An operator survey indicates the catalogue is missing common needs.
- A regulatory or partnership requirement asks for evidence-backed
  badges (e.g. "First-aid trained" needs a certificate on file before
  the badge can be set). Today the badge is a self-attestation by the
  operator; an evidence-gate would require a `CompanionDocument` link.
- We add automated badges (reliability, response time). At that point
  the column shape probably grows a `kind: 'manual' | 'earned'` column.
