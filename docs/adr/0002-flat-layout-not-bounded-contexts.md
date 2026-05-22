# ADR 0002: Flat layout, not bounded contexts (yet)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-22 |
| **Deciders** | Bassey Eyo (founder), Engineering (lead) |
| **Supersedes** | The bounded-contexts plan in `README.md` (pre-2026-05-22) |
| **Affected SDD sections** | §3 (Architecture style), §6 (Surfaces) |

## Context

The original README described a "modular monolith with eight bounded
contexts under `apps/web/src/server/contexts/`" — each context owning
its own models / services / routers / jobs, with `dependency-cruiser`
enforcing isolation, and a single `api.ts` per context as the only
file other contexts could import.

That plan never landed. By the time the platform reached production
(~30 stages, three portals, audit log, S3 storage, payments still
ahead), the actual layout had grown as:

- `src/app/<surface>/...` — App Router routes, one folder per surface.
- `src/lib/<concern>.ts` — one server-side library per domain concern,
  with the server actions, zod schemas, and audit calls colocated.

No `contexts/` folder, no `tRPC`, no `dependency-cruiser`. Inter-file
imports are unfettered.

## Decision

Keep the flat `src/app/` + `src/lib/` layout. Do not retrofit bounded
contexts at this stage.

## Why the flat layout has held up

- **One engineer, one head.** Bounded contexts pay off when teams need
  cognitive isolation. With a solo team, cognitive isolation is a tax.
- **Server actions over a router.** Next.js App Router server actions
  let each `lib/<thing>.ts` export functions that are called directly
  from the route file. No router composition; no router file to keep
  in sync with the contexts.
- **Audit + auth are already centralised.** `lib/audit.ts` and
  `lib/auth-helpers.ts` are the two cross-cutting concerns we cared
  about isolating. Both are single small files; both are used by every
  `lib/<thing>.ts` directly.
- **Reading the codebase end-to-end is fast.** Twenty-odd `lib/*.ts`
  files plus four route folders is easy to skim. The bounded-contexts
  layout would have produced eight folders × five files = 40 files at
  the same scope, plus a `tRPC` router map to navigate.

## When the flat layout will stop being right

Documented here so the trigger is concrete:

1. **Two engineers ship in the same area in the same week and step on
   each other.** That's the moment cognitive isolation starts paying
   for itself. The first one to merge writes the ADR-0002-supersede.
2. **A regulatory boundary appears** — for example, payments needs to
   move into its own audit zone, or safeguarding data needs an
   air-gapped escrow process. At that point one or two of the `lib/`
   modules need to become a clean module with a published API.
3. **The `lib/` folder crosses ~50 files** and people start failing to
   find what they need on first attempt. The trigger is operator
   complaint, not file count alone.

## Consequences

### Today

- New domain work follows the existing pattern: add `lib/<thing>.ts`,
  add `app/<surface>/<thing>/`, add a migration if needed.
- Cross-`lib/` imports are unrestricted. The audit log and the
  brand-voice lint do the heavy lifting for safety, not the file layout.
- Tests, when they land, will sit beside the file under test
  (`lib/match.test.ts`) rather than in a shared `__tests__` directory.

### When the trigger fires

- Carve out the first context (likely `payments` once Stripe lands).
  Move its `lib/` files into `src/server/contexts/payments/`. Add a
  `payments/api.ts`. Add a `dependency-cruiser` rule scoped to that
  one context first, not the whole codebase.
- Treat the migration as a 1–2 week piece of work, not a rewrite. The
  existing files are already organised by concern; the move is
  largely a rename + import path update.

## Triggers to revisit

- A second engineer ships their first PR.
- Payments lands and starts to feel like a distinct compliance domain.
- A safeguarding incident or audit calls for clearer module boundaries.
