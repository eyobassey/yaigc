# Design System — amendments log

The canonical v0 artefact is `Design_System_v0.docx` (snapshot dated May 2026).
This file records every decision made since v0 that materially changes a
position taken in the document. The .docx is the snapshot; this file is the
delta.

Each entry: date, what changed, why, references (commits, sections of the
.docx affected). Newest entries at the top.

---

## 2026-05-21 — Icon set introduced early (Sprint 1.5, not Sprint 4)

**Amends:** Section 3.3 "What does not yet exist anywhere", Section 8.5
"Sprint 4+ (operator console patterns)", Section 11 Open Question 11 "Do we
need an icon set?"

**What changed**

The v0 design system stated: *"Icon set. We have deliberately not introduced
one yet. Where icons would normally appear (in cards, in nav), we use
typographic glyphs or omit entirely. Revisit in Sprint 4."*

We are introducing the icon set **now**, at the end of Sprint 1 marketing
work. The named candidate from Open Question 11 — `lucide-react` — is the
library chosen. No change in library; only in timing.

**Why**

Two problems with the original "use typographic glyphs" position emerged
during Sprint 1 production work:

1. **Cross-platform inconsistency.** Unicode tick (`✓`), cross (`✗` / `×`),
   arrow (`→`), and plus (`+`) glyphs render very differently across
   macOS / Windows / iOS / Android system fonts. Visual weight, baseline
   position, and stroke thickness vary enough to break the carefully
   tuned brand typography.
2. **The VisitGallery card-suit icons (`♥ ◆ ♣ ♠`) felt off-brand** for a
   companionship product. The card-suit metaphor reads as playful or
   game-like; the brand is warm and editorial. Coffee / Footprints /
   Sparkles / PenLine (the lucide replacements) read as concrete
   referents to the actual visit content.

**What was changed in code**

Commit `07a15dd` — `feat(icons): adopt lucide-react site-wide; retire
Unicode glyphs`.

Mapping:

| Surface | Was | Now |
|---|---|---|
| Hero secondary CTA arrow | `→` | `<ArrowRight>` |
| Hero reassurance tick | `✓` | `<Check>` |
| Pricing tier features | `✓` | `<Check>` |
| Pricing "what is not included" | `×` | `<X>` |
| About promises + service area | `✓` | `<Check>` |
| Companions/join checklists | `✓` / `×` | `<Check>` / `<X>` |
| Companions/join secondary CTA | `→` | `<ArrowRight>` |
| FAQ + WhatIf accordion expand | `+` (rotated 45°) | `<Plus>` (rotated 45°) |
| Nav drawer close button | inline `<svg>` X path | `<X>` |
| VisitGallery cards | `♥ ◆ ♣ ♠` | `Coffee` / `Footprints` / `Sparkles` / `PenLine` |

**What stayed custom (not in lucide)**

- Nav burger menu (three-line-to-X animation is brand-character)
- CSS pulse dot on phone CTA (status indicator, not an icon)
- Logo SVGs (those are brand assets, not icons)

**Conventions for future icon use**

1. Always import from `lucide-react`, never inline SVGs for utility icons.
2. Default sizing: `size={16}` for inline-with-text, `size={18}` for list
   markers, `size={22}` for card icons, `size={20}` for buttons.
3. Default `strokeWidth={2}` for utility (Check / X / Plus), `strokeWidth={1.75}` for arrows, `strokeWidth={1.6}` for card icons (softer feel matching the
   serif typography).
4. Decorative icons (next to a text label that already says the same thing)
   get `aria-hidden="true"`. Icons that carry meaning alone get an
   `aria-label`.
5. Icons that need brand colour use Tailwind text colour classes — Lucide
   uses `currentColor` for the stroke.
6. **Don't add new icons speculatively.** Only import what's actually used.
   The tree-shaking only helps if we're disciplined about the import list.

**Status**

This amendment moves the icon section to **Status: Stable for utility
icons. Reconsider scope at Sprint 4 for operator-console patterns** (sort
arrows, table actions, status indicators, calendar pickers — those may want
a different library or richer custom set).

---
