# Content strings starter pack

A working starter for `packages/content/src/en-GB.ts` and `scripts/lint-content.ts`.

This is a real, drop-in deliverable for the You Are In Good Company web platform.
Both files are validated. The TypeScript compiles cleanly in strict mode.
The brand voice guard passes when run against the starter content.

## What is in the pack

| File | Path in the repo | Purpose |
|------|------------------|---------|
| `en-GB.ts` | `packages/content/src/en-GB.ts` | Single source of truth for every customer-facing string in the platform. Marketing pages, transactional emails, SMS templates, portal UI, error messages, empty states. |
| `lint-content.ts` | `scripts/lint-content.ts` | Brand voice guard that runs in CI. Fails the build if any string literal in scope contains a forbidden word or character. |
| `README.md` | `packages/content/README.md` | This file. How the system works. |

## How the system works

1. **Engineers and copywriters edit `en-GB.ts`.** No marketing copy lives anywhere else in the codebase. If a component needs a label, it imports from `@igc/content`.

2. **The brand voice guard runs on every PR.** It scans only string literals (not comments), within the scoped paths (`packages/content/src/**`, `apps/web/src/content/**`, marketing page files). It enforces the rules at the top of `en-GB.ts`.

3. **The rules have nuance.** The word "care" is forbidden when describing what we deliver, but allowed inside specific compound phrases that name what we are not ("not a care agency", "personal care") or refer to regulated partner services ("regulated home-care agency"). The allow-list is explicit and reviewable.

4. **Comments mention forbidden words deliberately.** The header comment in `en-GB.ts` lists every forbidden word so a new engineer reading the file understands the rules without leaving the file. The guard strips comments before scanning, so this is safe.

## Brand voice rules (enforced)

Forbidden words (case-insensitive):

- **"care"** - never use to describe what we deliver. Allowed in compound phrases: "care agency", "personal care", "home-care", "home care", "clinical care", "care role", "care quality commission", "cqc". Any other use of "care" fails the build.
- **"elderly"** - no exceptions. Use "older", "your mum", "your dad", or name the person.
- **"lonely" / "loneliness"** - no exceptions. We name the solution ("good company"), not the diagnosis.
- **"vulnerable"** - no exceptions in customer-facing strings.
- **"befriender" / "befriending"** - no exceptions. We have companions.
- **"client"** - no exceptions. We have families.
- **"service user"** - no exceptions.

Forbidden characters:

- **Em dash (`—`)** - banned brand-wide. Use commas, semicolons, colons, parentheses, or hyphens (`-`).

Tone rules (manually enforced through review, not by CI):

- Second person. Speak to the buyer, not at them.
- Short sentences. Concrete nouns ("a cup of tea", "a walk to the garden centre"). Not abstract ones ("engagement", "wellbeing outcomes").
- Use "your mum, your dad, your gran, your grandad" rather than "older adults".
- Every public page closes with: "You are in good company."
- Companions sign post-visit reports with: first name + "with In Good Company" + "Until next time. You are in good company."

## Brand name conventions

- **"You Are In Good Company"** is the canonical brand name. Used on the cover, in headers, in formal/legal contexts, in the brand architecture table, on the legal entity, in trademark filings.
- **"In Good Company"** is acceptable inside prose where the full name reads awkwardly. Examples: "the In Good Company team", "with In Good Company" (post-visit report signoff), "Internal In Good Company staff".

Both forms appear in `en-GB.ts` deliberately. The `brand.fullName` and `brand.shortName` keys document the distinction.

## Structure of `en-GB.ts`

The file is organised into 16 sections, each exported as a top-level constant:

1. Brand strings (`brand`)
2. Navigation (`nav`)
3. Home page (`home`)
4. How it works page (`howItWorks`)
5. Pricing page (`pricing`)
6. Safeguarding page (`safeguarding`)
7. FAQ (`faq`)
8. Join The Companion Club (`joinCompanionClub`)
9. Contact (`contact`)
10. Transactional emails (`emails`)
11. SMS templates (`sms`)
12. Post-visit report scaffolding (`postVisitReport`)
13. Portal common UI (`portalCommon`)
14. Operator console (`operatorConsole`)
15. Footer (`footer`)
16. Default export (`content`)

## How to use in components

```ts
// In a React component
import content from '@igc/content';

export function Hero() {
  return (
    <section>
      <p>{content.home.hero.eyebrow}</p>
      <h1>{content.home.hero.headline}</h1>
      <p>{content.home.hero.body}</p>
      <a href="/contact">{content.home.hero.primaryCta}</a>
    </section>
  );
}
```

Or import specific sections:

```ts
import { home, brand } from '@igc/content';
```

## How to use in emails

Email templates use placeholder substitution. The render function lives in
`src/server/contexts/notification/render.ts` (Sprint 1 ticket).

```ts
import { emails } from '@igc/content';
import { renderEmail } from '@/server/contexts/notification/render';

const html = renderEmail(emails.bookingConfirmed, {
  firstName: 'Helen',
  recipientName: 'Margaret',
  companionName: 'Sarah',
  date: 'Wednesday 4 June',
  time: '2pm',
  duration: 'two hours',
  visitRef: 'IGC-2026-00123',
  linkUrl: 'https://youareingoodcompany.co.uk/visits/IGC-2026-00123',
});
```

## Running the brand voice guard locally

```bash
# From the repo root
pnpm tsx scripts/lint-content.ts
```

Or run it via the npm script:

```bash
pnpm lint:content
```

The guard runs automatically in CI on every PR (see `.github/workflows/ci.yml`).

## Adding a new language

When (much later) a second language is added:

1. Create `packages/content/src/cy-GB.ts` (Welsh, for example) with the same shape.
2. Update `packages/content/src/index.ts` to export a locale switcher.
3. Update `lint-content.ts` to scan the new file too.
4. Translate everything. Do not auto-translate brand strings, taglines, or the closing line.

## Open questions for the editorial team

These strings are starters, not finals. Before launch, walk through:

- Pricing: confirm the actual hourly rate (£32 is a working figure, not a decision).
- Phone number: replace `0161 000 0000` with the real number once the line is live.
- Testimonial on the home page: this is a placeholder quote in the right voice. Replace with a real first-customer testimonial as soon as one exists.
- Companion bio examples in the marketing copy: write three real bios with three real companions and consent, then weave them into `/companions`.
- FAQ list: prune anything that no real family has asked. Add what they actually do ask.

## Maintenance discipline

- **Never inline a marketing string in a component.** Always import from `@igc/content`. If a component needs a one-off string, add it to `en-GB.ts` first, then import it. This protects the brand voice as the team grows.
- **The lint rule is the architecture.** If a contributor wants to bypass it, they need to write an ADR explaining why. A passing CI check is not a suggestion.
- **Review copy with the founder.** Until the team is established, every PR that touches `en-GB.ts` has the founder as a required reviewer (see CODEOWNERS).
