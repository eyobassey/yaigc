# You Are In Good Company

> Companionship visits for the people who matter most.

A UK marketplace that connects vetted, trained, insured companions with older
adults who would benefit from a friendly visit. We are not a care agency.
We do not deliver personal care, medication, or clinical support.
We deliver visits.

This repository contains the web platform that powers the service: marketing
site, family portal, companion portal, and operator console. One application,
one database, organised internally as a modular monolith with eight bounded
contexts.

**Status**: pre-Sprint-0. This README and the `packages/content/` starter are
the only artefacts so far. See [Where things are](#where-things-are) below for
the honest list.

---

## Contents

- [What you are looking at](#what-you-are-looking-at)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [Common commands](#common-commands)
- [Development workflow](#development-workflow)
- [Bounded contexts](#bounded-contexts)
- [Where things are](#where-things-are)
- [Conventions](#conventions)
- [Testing](#testing)
- [Brand voice guard](#brand-voice-guard)
- [Environments and deployment](#environments-and-deployment)
- [Security and privacy](#security-and-privacy)
- [Where to find help](#where-to-find-help)
- [Further reading](#further-reading)

---

## What you are looking at

This is the working repository for the You Are In Good Company web platform.

The product is described in detail in
[`docs/PRD.pdf`](docs/PRD.pdf) and the
[Engineering Kickoff Pack](docs/Engineering_Kickoff_Pack.docx). Read the PRD
first if you are new to the project. It explains the problem, the market,
the brand, the user types, the scope, the architecture, the data model, the
success metrics, and the development roadmap.

In short:

- **The buyer** is the adult child who lives 200 miles from their parent and worries.
- **The recipient** is the parent or grandparent (almost always 65+) who lives alone too much.
- **The companion** is a vetted, trained, insured person who visits weekly, builds a relationship, and writes a short note after every visit.
- **The platform** is what holds it all together: bookings, post-visit reports, payments, safeguarding records, and the audit trail.

Phase 1 (months 1 to 9) runs as a manual concierge service with the platform
operating in the background. Phase 2 (months 9 to 18) opens self-serve
portals. Phase 3 (months 18 to 36) is geographic expansion and council /
ICB partnerships. The platform architecture supports all three phases without
re-platforming.

---

## Quick start

This repository is developed and staged on a single London IONOS server in
Phase 1. The same machine hosts local development (Docker stack), staging
(`staging.youareingoodcompany.co.uk`), and production
(`youareingoodcompany.co.uk`), with strict separation of databases, Redis
indices, PM2 process pools, and Cloudflare routes. See
[Environments and deployment](#environments-and-deployment) for the full
picture.

Target: from `git clone` to a running app in under 2 hours, no help needed.

### Prerequisites

Installed on the box (or your laptop, if you prefer to develop off-server):

- **Node.js** (version pinned in `.nvmrc`, currently 20 LTS). Use `nvm` or `fnm`.
- **pnpm** 9 or later: `npm install -g pnpm`.
- **Docker** 24+ (for local Postgres, Redis, MailHog, and S3 emulation). Already installed on the IONOS box.
- **Git** 2.40+.
- **1Password CLI** (`op`) configured for the company vault. Used to inject real secrets into `.env.local` without ever writing them to disk in plaintext.

If you are developing directly on the IONOS box, all of the above are
preinstalled. If you are developing on a laptop, install them first.

### First-time setup

```bash
# 1. Clone the repository
git clone git@github.com:in-good-company/igc-platform.git
cd igc-platform

# 2. Use the right Node version
nvm use   # or: fnm use

# 3. Install dependencies (this also runs prisma generate)
pnpm install

# 4. Pull secrets from 1Password into your local .env file
op inject -i .env.example -o apps/web/.env.local

# 5. Start local infrastructure (Postgres, Redis, MailHog, s3-mock)
pnpm docker:up

# 6. Run database migrations and seed development data
pnpm db:migrate
pnpm db:seed

# 7. Start the application
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You
should see the marketing home page.

Open [http://localhost:3000/styleguide](http://localhost:3000/styleguide)
to verify the brand tokens render correctly. If moss green, warm cream, and
terracotta look right and the Fraunces + Inter typography loads, the setup
is working.

To sign in as the seeded operator user:

- Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in)
- Email: `founder@youareingoodcompany.test`
- Click "Email me a sign-in link"
- Open [http://localhost:8025](http://localhost:8025) (MailHog) and click the magic link in the most recent email
- You should land on the operator console at `/operator`

### If something does not work

You are the only engineer right now. The fastest way to unstick yourself is
the ladder below, in order:

1. Check `docker ps` to confirm Postgres, Redis, MailHog, and s3-mock are running.
2. Check `apps/web/.env.local` exists and has values (the 1Password inject step is the most common stumble).
3. Check Node version with `node --version`. It must match `.nvmrc`.
4. Try `pnpm db:reset` to wipe and re-seed the local database.
5. Read the runbook at [`docs/runbooks/local-dev-troubleshooting.md`](docs/runbooks/local-dev-troubleshooting.md) (write entries to it whenever you hit a new issue, so future-you finds the answer in 30 seconds).
6. Pair with `rubber-duck.md`: write the problem in plain English in a scratch file. Half the time, that surfaces the fix.

A 30-minute time-box is fair before walking away from the keyboard. Coming
back to a problem after a break is faster than grinding.

### What to do next

- Read [`docs/PRD.pdf`](docs/PRD.pdf) for product context.
- Read [`docs/adr/`](docs/adr/) for architectural decisions and why they were made.
- Read [`packages/content/README.md`](packages/content/README.md) for the brand voice rules. CI enforces these.
- Pick the next Sprint 0 ticket from Linear and start.

---

## Project structure

```
igc-platform/
├── apps/
│   └── web/                        # Next.js 14 (App Router) application
│       ├── public/                 # Static assets, favicons, fonts, brand marks
│       ├── src/
│       │   ├── app/                # App Router routes
│       │   │   ├── (marketing)/    # Public marketing pages
│       │   │   ├── (family)/       # Family portal routes
│       │   │   ├── (companion)/    # Companion portal routes
│       │   │   ├── (operator)/     # Operator console routes
│       │   │   ├── api/            # REST route handlers (webhooks, integrations)
│       │   │   ├── styleguide/     # Renders design tokens for QA
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components/         # React components
│       │   │   ├── ui/             # shadcn/ui-based primitives, brand-themed
│       │   │   ├── marketing/      # Marketing-specific compositions
│       │   │   ├── portal/         # Portal-specific compositions
│       │   │   └── icons/          # Brand icon set
│       │   ├── server/             # Server-only code
│       │   │   ├── auth.ts         # Auth.js configuration
│       │   │   ├── db.ts           # Prisma client singleton
│       │   │   ├── trpc.ts         # tRPC root router composition
│       │   │   └── contexts/       # The eight bounded contexts (see below)
│       │   ├── lib/                # Isomorphic shared utilities
│       │   ├── content/            # MDX content (legal pages, FAQ, blog)
│       │   ├── styles/             # Tailwind config inputs, globals.css
│       │   ├── types/              # Shared TypeScript types
│       │   └── middleware.ts       # Auth + role-based middleware
│       ├── tests/
│       │   ├── e2e/                # Playwright
│       │   ├── integration/        # Vitest + supertest
│       │   └── unit/               # Vitest
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       └── package.json
├── packages/
│   ├── design-tokens/              # Brand colours, typography, spacing scale
│   ├── content/                    # Customer-facing copy strings (en-GB.ts)
│   └── tsconfig/                   # Shared tsconfig presets
├── prisma/
│   ├── schema.prisma               # Database schema (single file)
│   ├── migrations/                 # Version-controlled migrations
│   └── seed.ts                     # Seed for local + staging
├── deploy/
│   ├── pm2/                        # PM2 ecosystem configs per environment
│   │   ├── staging.config.cjs
│   │   └── production.config.cjs
│   ├── nginx/                      # Reverse proxy configs in front of PM2
│   └── deploy.sh                   # SSH-based release script (symlink swap)
├── docs/
│   ├── PRD.pdf                     # Product Requirements Document
│   ├── Engineering_Kickoff_Pack.docx
│   ├── adr/                        # Architectural Decision Records
│   ├── runbooks/                   # Operator and engineering runbooks
│   ├── compliance/                 # GDPR, DPIA, safeguarding crosswalks
│   └── decisions.md                # Open decisions log
├── scripts/
│   ├── dev.sh                      # Spin up local dev (Docker + app)
│   ├── seed.sh                     # Reset and seed the dev database
│   └── lint-content.ts             # Brand voice guard (forbidden words)
├── .github/
│   ├── workflows/                  # CI/CD (lint, test, deploy via SSH)
│   ├── pull_request_template.md
│   └── CODEOWNERS
├── docker-compose.yml              # Postgres, Redis, MailHog, S3 mock
├── .env.example                    # Placeholder env vars (real values via 1Password)
├── .nvmrc                          # Node version pin
├── package.json                    # Root pnpm workspace orchestration
├── pnpm-workspace.yaml
└── README.md                       # You are here
```

---

## Tech stack

The stack is documented in detail in
[`docs/adr/0001-stack-choice.md`](docs/adr/0001-stack-choice.md) and the
surrounding ADRs. Summary:

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 14 (App Router) | Server-rendered marketing pages, client-rendered portals |
| Language | TypeScript (strict) | No `any` allowed by ESLint rule |
| Styling | Tailwind CSS + design-tokens package | No hex codes outside the tokens package |
| Component primitives | shadcn/ui (copy-paste, not dependency) | Owned in-repo, fully themable, accessible by default |
| API | tRPC (portals) + REST (webhooks, integrations) | Type-safe in-process for portals, REST for Stripe / Brevo / Twilio / uCheck |
| Validation | Zod | Single source of truth for runtime validation and TypeScript types |
| Database | PostgreSQL 16+ | Host-installed on the IONOS box for Phase 1. Managed Postgres (Neon EU or RDS eu-west-2) at Phase 2 scale. See [ADR 0010](docs/adr/0010-hosting-ionos.md) for the trigger |
| ORM | Prisma | See [ADR 0006](docs/adr/0006-prisma-over-typeorm.md) for why not TypeORM |
| Auth | Auth.js v5 (NextAuth) | Magic link + password + optional SMS 2FA, database sessions |
| Background jobs | BullMQ on Redis | Self-hosted Redis on the same box. Bull-board pinned behind operator auth for queue inspection |
| Email | Brevo | EU data residency. Transactional in v1, marketing email in Phase 2 |
| SMS | Twilio (UK) | Visit reminders, 2FA, urgent operator notifications |
| Payments | Stripe (Subscriptions + Connect Custom) | Family billing and companion payouts. Stripe is the source of truth for the ledger |
| Identity | Stripe Identity | ID verification for companions |
| DBS | uCheck | Enhanced DBS checks (UK) |
| File storage | AWS S3 (eu-west-2) | New AWS account under YAIGC Services Ltd, scoped `yaigc-app` IAM user |
| Observability | Sentry, Better Stack, PostHog (EU cloud) | Errors, structured logs, product analytics |
| Hosting | IONOS London VPS + PM2 | One box for Phase 1 (local + staging + production, isolated by DB / Redis index / port / hostname). See [ADR 0010](docs/adr/0010-hosting-ionos.md) |
| CDN / WAF / DNS | Cloudflare | DNS, WAF, edge caching, free TLS, DDoS protection |
| CI/CD | GitHub Actions | Lint, typecheck, test, then SSH deploy to the box with symlink-swap releases |
| Secrets | PM2 ecosystem files initially, AWS Secrets Manager before first paid visit | See [ADR 0011](docs/adr/0011-secrets-management.md) for the migration trigger |
| Testing | Vitest + Playwright | Unit, integration, e2e |

### Architecture style

**Modular monolith with bounded contexts.** Not microservices.
See [ADR 0003](docs/adr/0003-modular-monolith.md) for the full reasoning.

One application. One database. Internally organised into eight bounded
contexts that own their own models, services, routers, and tests, and
expose a small public API to the rest of the application.
A `dependency-cruiser` rule (enforced in CI) blocks any context from
importing another context's internal files directly.

If, in Phase 3 or 4, we genuinely need to extract a context to a separate
service (because of compliance scope, scaling pressure, or team boundaries),
the bounded-context structure makes extraction a two-week exercise, not a
six-month rewrite.

---

## Common commands

```bash
# Development
pnpm dev                  # Start the app in dev mode at localhost:3000
pnpm docker:up            # Start local Postgres, Redis, MailHog, s3-mock
pnpm docker:down          # Stop local infrastructure
pnpm build                # Production build
pnpm start                # Run production build locally

# Database
pnpm db:migrate           # Apply migrations to local DB
pnpm db:seed              # Seed development data
pnpm db:reset             # Wipe DB, re-run migrations, re-seed
pnpm prisma studio        # GUI for inspecting the local DB

# Quality
pnpm lint                 # ESLint across all packages
pnpm typecheck            # TypeScript across all packages
pnpm format               # Prettier (writes changes)
pnpm format:check         # Prettier (read-only check)
pnpm lint:content         # Brand voice guard

# Tests
pnpm test                 # Run all unit + integration tests (Vitest)
pnpm test:watch           # Vitest in watch mode
pnpm test:e2e             # Playwright end-to-end tests
pnpm test:e2e:ui          # Playwright with UI runner

# Deploys (run from your laptop, not the server)
pnpm deploy:staging       # Trigger the staging deploy workflow
pnpm deploy:production    # Trigger the production deploy workflow (tagged releases only)

# Other useful
pnpm --filter web <cmd>   # Run a command only in the web app workspace
pnpm clean                # Remove node_modules and build artefacts
```

---

## Development workflow

Solo engineer for now. The workflow below is calibrated for one person, with
hooks for adding a second engineer without rewriting the rules.

### Branching

- `main` is the trunk. Protected. No direct pushes, even for the solo
  engineer. PRs only. The PR exists so future-you and CI both get a chance
  to catch problems.
- Feature branches: `feat/IGC-S0-XXX-short-slug`
- Bug fixes: `fix/IGC-S0-XXX-short-slug`
- Chores / docs: `chore/short-slug` or `docs/short-slug`

The ticket ID prefix (`IGC-S0-XXX`) links the branch to Linear automatically.

### Commits

[Conventional Commits](https://www.conventionalcommits.org/). One of:

```
feat: add post-visit report form
fix: handle expired DBS edge case in matching
chore: bump dependencies
docs: clarify cooling-off rule
refactor: extract booking state machine
test: cover payment retry logic
perf: index audit log queries by entity
```

If your change relates to a ticket, put the ticket ID in the commit body:

```
feat: scaffold bounded-context directories

Closes IGC-S0-029
```

### Pull requests and review

The PR template (auto-loaded) asks for: linked ticket, what the PR does,
acceptance criteria as checkboxes, manual test steps, screenshots if UI,
risks, and the definition-of-done checklist.

CI runs on every PR. PRs cannot merge until CI is green.

**Solo-engineer review ritual.** Until a second engineer is on the team:

1. Open the PR as a draft when you have something testable.
2. Self-review the diff in the PR view (not the editor). The PR view forces
   you to read it like a reviewer would.
3. Let it soak for at least an hour before merging. Overnight if you can
   afford it. Most "oh no" moments arrive in the shower, not the editor.
4. For PRs touching `prisma/schema.prisma`, `packages/content/`, anything
   in `(operator)`, or anything safeguarding-related: 24-hour soak minimum.
   No exceptions.
5. Merge with squash. Linear history on `main`.

When a second engineer joins, replace the soak rule with one approval
required (two for the same sensitive paths). The CODEOWNERS file is already
written for that future state.

### Merging

- **Squash and merge.** Linear history on `main`.
- The squash commit message follows the same conventional-commits format.
- Branches are deleted automatically on merge.

---

## Bounded contexts

The application is organised as eight bounded contexts. Each owns a slice of
the domain. Cross-context interaction goes through explicit public APIs,
never through shared internal models or direct database joins.

Each context lives in `apps/web/src/server/contexts/<name>/`.

| Context | Owns |
|---------|------|
| `family` | Family households, family payers, recipients, household members, family-side preferences and consents |
| `companion` | Companion profiles, onboarding state, availability, compliance documents (DBS, training, insurance), companion-side preferences |
| `visit` | Bookings, visit state machine, scheduling, post-visit reports, recurrence, the Match relationship between a Family and a Companion |
| `payment` | Stripe integration, subscriptions, one-off charges, refunds, companion payouts via Stripe Connect, invoices |
| `safeguarding` | Safeguarding cases, severity triage, escalation workflow, incident logging, regulator-facing exports |
| `audit` | Append-only audit log writer. Every other context calls `audit` to record sensitive actions. Never modified, never deleted |
| `notification` | Email (Brevo), SMS (Twilio), and in-app notification dispatch. Templates and content strings live here |
| `operator` | Operator console surfaces: dashboards, search across contexts, bulk actions, content management. Consumes other contexts; does not own customer data itself |

Each context folder has the same shape:

```
contexts/<name>/
├── models.ts        # Domain models (internal)
├── service.ts       # Business logic (internal)
├── router.ts        # tRPC router (mounted in src/server/trpc.ts)
├── jobs.ts          # Background jobs owned by this context (BullMQ workers)
├── api.ts           # Public API. The ONLY file other contexts may import.
└── __tests__/
```

**Rule (enforced in CI by `dependency-cruiser`):** a file inside one context
can only import another context through that context's `api.ts`. Direct
imports of another context's `models.ts` or `service.ts` will fail the lint
step.

If you want to bypass this, write an ADR explaining why. A passing CI check
is the architecture in this codebase. The rule is not a suggestion.

---

## Where things are

This section is honest about what is built, what is in progress, and what is
still empty. It is updated as Sprint 0 progresses and beyond.

### Built and working

> Updated as each item lands. Nothing is built yet beyond this README and the
> `packages/content/` starter (en-GB.ts + lint rule). Tick each box only when
> the thing actually works on staging, not when the PR is open.

- [ ] Repository, CI/CD, SSH-deploy pipeline to the IONOS box
- [ ] Local development environment (Docker)
- [ ] Design tokens (`packages/design-tokens`) with full brand palette
- [x] Content strings (`packages/content`) with brand voice guard
- [ ] Self-hosted Fraunces and Inter fonts
- [ ] `/styleguide` route rendering all tokens
- [ ] Prisma schema v0 (User, Family, FamilyMember, Recipient, Companion, Visit, AuditLogEntry, Session)
- [ ] Seed script with realistic dev data
- [ ] Bounded-context directory scaffolding with `dependency-cruiser` enforcement
- [ ] Auth.js v5 with magic link + password + database sessions
- [ ] Role-based middleware enforcing route-group access
- [ ] `/me` smoke-test page
- [ ] Audit log writer wired into auth flows
- [ ] Sentry, PostHog (EU, gated on cookie consent), Better Stack logging
- [ ] Cookie consent banner
- [ ] Legal page surfaces (privacy, terms, accessibility, cookies, safeguarding) as editable MDX
- [ ] First 11 ADRs documenting the major decisions

### In flight (Sprint 1+)

- [ ] Marketing site pages: home, how-it-works, pricing, our-companions, about, FAQ, join-the-companion-club, contact
- [ ] Family portal: sign-up, dashboard, visits, recipient profile, plan and payments, household, messages
- [ ] Companion portal: application, onboarding tracker, profile, availability calendar, visits, post-visit report, earnings
- [ ] Operator console: family list, companion roster, booking management, safeguarding cases, payment ledger, audit viewer
- [ ] Booking engine: state machine, recurring schedules, cooling-off rules
- [ ] Post-visit report flow
- [ ] Stripe Subscriptions integration (family billing)
- [ ] Stripe Connect integration (companion payouts)
- [ ] SMS reminders (Twilio)
- [ ] DBS expiry tracking and alerts (uCheck)
- [ ] Identity verification (Stripe Identity)

### Not yet started (Phase 2+)

- [ ] Public companion ratings (gated, moderated)
- [ ] Direct Payment invoicing (Care Act 2014)
- [ ] Family-companion structured messaging
- [ ] Gift vouchers
- [ ] Multi-language support
- [ ] Native mobile apps

If you are starting a new task, check this section first. If something you
need is in the "Built and working" list but does not actually work, fix it
and update the list. Lists that lie are worse than no lists.

---

## Conventions

The full list of conventions lives in
[`CONTRIBUTING.md`](CONTRIBUTING.md). The headlines:

### TypeScript

- Strict mode on. No `any`. No `// @ts-ignore` without a comment explaining why.
- Prefer types over interfaces unless you need declaration merging.
- Zod is the single source of truth for runtime validation. Derive TypeScript types from Zod schemas, not the other way around.

### React / Next.js

- Server Components by default. Client Components only when needed (interactivity, state, effects).
- Use `"use client"` at the top of files that need it. Never spread it across a directory by mistake.
- Co-locate component tests next to the component.
- No global state for portal logic. Server state lives on the server. UI-only state uses React hooks, or Zustand if it becomes necessary.

### Styling

- Tailwind utility classes, sourced from the design tokens.
- No inline `style={{}}` for brand-coloured things. If you reach for it, add the missing token to `packages/design-tokens` instead.
- No hex codes in `.tsx` files. ESLint enforces this outside the tokens package.

### Database

- Migrations are append-only. Never edit a committed migration. Add a new migration that reverses or amends the previous one.
- Every Prisma model includes `createdAt` and `updatedAt` unless it is intentionally append-only.
- Every model that holds personal data includes a `deletedAt` nullable for soft-delete with audit trail.

### Naming

- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components.
- Variables: `camelCase`. Constants: `SCREAMING_SNAKE_CASE`.
- React components: `PascalCase`, named exports preferred.
- Booleans: `is*`, `has*`, `should*`. Never `flag*`.

---

## Testing

We follow the test pyramid: many unit tests, fewer integration tests, fewest e2e tests.

### Unit tests (Vitest)

- Co-located next to the source. `foo.ts` has a sibling `foo.test.ts`.
- Pure functions, validation logic, state machines, utility code.
- Should run in under 5 seconds for the whole suite at Sprint 0 size.

### Integration tests (Vitest + supertest)

- Live in `apps/web/tests/integration/`.
- Test tRPC routers, REST route handlers, and database interactions.
- Use a per-test transaction that rolls back, so tests can run in parallel.

### End-to-end tests (Playwright)

- Live in `apps/web/tests/e2e/`.
- Test user flows that cross multiple pages and contexts.
- Run against staging on protected-branch pushes (not every PR, because they are slow).
- The Sprint 0 e2e suite covers: sign-up, magic-link sign-in, view `/me`, sign-out.

### Coverage

We do not chase a coverage percentage. We do chase tests for anything safety-relevant:

- Audit log writes
- Booking state transitions
- Cooling-off rule enforcement
- DBS-expiry checking
- Role-based middleware
- Payment webhook idempotency

If a bug ever escapes one of these, that is the test we owe ourselves to write.

---

## Brand voice guard

The brand voice is enforced in code. Marketing copy is not just a marketing
concern.

### Where copy lives

All customer-facing strings live in `packages/content/src/en-GB.ts`.
Components import from this package and never inline marketing strings.

```ts
import content from '@igc/content';

export function Hero() {
  return <h1>{content.home.hero.headline}</h1>;
}
```

### What CI enforces

`scripts/lint-content.ts` runs on every PR. It scans string literals (not
comments) in scoped paths and fails the build if any of the following appear:

- **"care"** - outside an allowed compound phrase (`personal care`, `home-care agency`, `clinical care`, `care role`, `not a care agency`, `cqc`). We deliver companionship, not care.
- **"elderly"** - no exceptions. Use "older", "your mum", "your dad", "your gran", "your grandad", or name the person.
- **"lonely" / "loneliness"** - no exceptions. Name the solution, not the diagnosis.
- **"vulnerable"** - operator-internal only. Never customer-facing.
- **"befriender" / "befriending"** - we have companions.
- **"client" / "service user"** - we have families and recipients.
- **Em dash (the `—` character, U+2014)** - banned brand-wide. Use commas, semicolons, colons, parentheses, or hyphens (`-`) instead.

The full rules and rationale live in
[`packages/content/README.md`](packages/content/README.md).

### Brand name conventions

- **"You Are In Good Company"** is the canonical brand name. Used on the cover, in headers, in formal / legal contexts, in the legal entity name, in trademark filings.
- **"In Good Company"** is acceptable inside prose where the full name reads awkwardly: "the In Good Company team", "with In Good Company" (post-visit report signoff), "Internal In Good Company staff".

---

## Environments and deployment

In Phase 1, all three runtime environments share the same IONOS London VPS.
They are isolated by Postgres database, Redis logical database, PM2 process
pool, port, and Cloudflare-routed hostname. The dev workflow uses Docker on
the same box to keep the dev database completely separate from
staging-on-the-box.

| Environment | Hostname | Database | Redis | Port | Process namespace |
|-------------|----------|----------|-------|------|---------|
| Local (dev) | `localhost:3000` (loopback only) | Docker Postgres (`igc_dev`) | Docker Redis | 3000 | `pnpm dev`, no PM2 |
| Staging | `staging.youareingoodcompany.co.uk` | Host Postgres (`igc_staging`) | Host Redis DB 1 | 3001 | `igc-staging-*` |
| Production | `youareingoodcompany.co.uk` | Host Postgres (`igc_prod`) | Host Redis DB 0 | 3002 | `igc-prod-*` |

Cloudflare sits in front of every public hostname. Staging is additionally
protected by a Cloudflare Access policy (allowlist by email or IP) so it does
not leak to the public web or to search indexers. The marketing site is the
only thing on production that is publicly reachable before launch.

### How deploys work

Deploys are GitHub Actions workflows that build, test, and then SSH into the
IONOS box to perform a release. The release flow is symlink-swap:

1. CI builds the application in a clean Docker image identical to the box's runtime.
2. CI uploads the build to `/var/www/igc-platform/releases/<sha>/` on the box.
3. CI runs Prisma migrations against the target database before the swap.
4. CI performs a health check against the new release on a non-public port.
5. If the health check passes, the `current` symlink swaps to point at the new release.
6. PM2 reloads the process pool (`pm2 reload deploy/pm2/<env>.config.cjs --update-env`). PM2 reload is zero-downtime: it spawns new workers before killing old ones.
7. The previous five releases are kept on disk for rollback. Rolling back is `ln -sfn releases/<previous-sha> current && pm2 reload ...`.

Triggers:

- **Staging**: every push to `main` triggers `deploy:staging` automatically.
- **Production**: tagged releases (`git tag v1.x.x && git push --tags`) trigger `deploy:production`. The workflow requires a manual approval step in GitHub Actions before the SSH step runs.

See [`deploy/deploy.sh`](deploy/deploy.sh) for the actual release script and
[`docs/runbooks/deploy-and-rollback.md`](docs/runbooks/deploy-and-rollback.md)
for the operator runbook.

### Re-platform trigger

This single-box-for-everything setup is fit for Phase 1 (concierge mode, up
to ~20 active families). It is not fit forever. The trigger to move
production off this box is documented in
[ADR 0010](docs/adr/0010-hosting-ionos.md). Headlines:

- First SLO breach (sustained downtime above the 99.9% target) in a calendar quarter, **or**
- 100 active recurring families on the platform, **or**
- A second engineer ships their first PR (a teammate makes the single-box risk asymmetric), **whichever first**.

When the trigger fires, production moves to managed Postgres
(Neon EU or AWS RDS eu-west-2) and managed application hosting (re-evaluate
Vercel, Railway, Fly.io). The IONOS box stays as staging.

### Backups and disaster recovery

- Postgres: nightly `pg_dump` to AWS S3 (eu-west-2) with versioning enabled. Hourly logical replication slots configured ahead of any cutover. 30-day retention.
- Redis: not backed up (job queues only; idempotent retry covers the loss of in-flight work).
- File storage: AWS S3 versioning + lifecycle to Glacier Deep Archive after 90 days.
- Test restore: scheduled quarterly, results recorded in [`docs/runbooks/database-restore.md`](docs/runbooks/database-restore.md).

RTO target: 4 hours. RPO target: 1 hour. These are PRD §7.3 targets and are
audit-relevant.

---

## Security and privacy

This is not optional. The platform processes special-category data: anything
that touches a recipient's personal life is treated as sensitive. The full
posture lives in [`docs/compliance/`](docs/compliance/).

The headlines:

### Secrets

- Real secrets live in 1Password (with a planned migration to AWS Secrets Manager before the first paid visit). Never committed to the repository. Never injected through a Vercel UI (we do not use Vercel).
- Each environment has its own secret set. No reuse across environments.
- PM2 ecosystem files on the box load secrets from a directory readable only by the `deploy` user.
- 1Password Business audit logging captures every access to a vault entry.

### Authentication

- Auth.js v5 with database sessions (not JWT).
- Magic link or password, both delivered via Brevo.
- SMS-based 2FA available; mandatory for operator-console roles.
- Failed sign-in attempts are rate-limited and audit-logged.

### Authorisation

- Role-based access control enforced at the middleware layer.
- Routes are scoped by App Router route groups: `(marketing)`, `(family)`, `(companion)`, `(operator)`.
- Operator console actions are audit-logged comprehensively.

### Data protection

- ICO registration completed. Data Controller is You Are In Good Company Services Ltd.
- UK and EU data residency only. No personal data crosses the Atlantic without an explicit transfer impact assessment.
- DPIA completed pre-launch.
- Data retention: visit records 7 years (Care Act 2014 audit), financial records 7 years (HMRC), deleted-account residual data 6 months.
- Personal data is masked by default in the operator console. Sensitive fields require a deliberate reveal action, which is audit-logged.
- All third-party processors (Stripe, Brevo, Twilio, uCheck, PostHog, Sentry, Cloudflare, IONOS, AWS) have signed DPAs.

### Reporting a vulnerability

If you find a security issue, please email
**security@youareingoodcompany.co.uk**. Do not open a public GitHub issue.
We respond within 24 working hours, and we operate a safe-harbour position
for good-faith disclosure. See [`SECURITY.md`](SECURITY.md) for full details.

---

## Where to find help

In rough order of how long the answer takes:

1. **Skim this README.** Search for keywords with `Ctrl/Cmd + F`.
2. **Check `docs/`.** The PRD, ADRs, and runbooks cover most of the "why" questions.
3. **Search Linear** for past tickets discussing the same area.
4. **Write the question in plain English** in a scratch file. The act of articulating the problem often surfaces the answer.
5. **Walk away for 20 minutes.** Coming back to a problem after a break is faster than grinding.
6. **Update the relevant runbook** once you have the answer, so future-you finds it faster.

For non-engineering questions:

- Brand voice, copy, marketing strategy, product priorities: Bassey (founder).
- Operations, safeguarding, companion vetting: the operations co-founder (named once appointed).
- Finance, vendor billing: finance@youareingoodcompany.co.uk.
- Anything legal, contractual, or HR: do not improvise. Email Bassey first.

---

## Further reading

Substantial documents are kept separate from this README rather than crammed
into it.

### Product

- [Product Requirements Document](docs/PRD.pdf) - what we are building, who for, why, when. Read first.
- [Engineering Kickoff Pack](docs/Engineering_Kickoff_Pack.docx) - Sprint 0 ticket backlog, repo scaffold rationale, environment setup checklist.

### Architecture (Sprint 0 deliverable; not yet authored)

- [`docs/adr/`](docs/adr/) - Architectural Decision Records. The "why" behind each technology choice.
  - [0001 - Stack choice](docs/adr/0001-stack-choice.md)
  - [0002 - Monorepo structure](docs/adr/0002-monorepo-structure.md)
  - [0003 - Modular monolith over microservices](docs/adr/0003-modular-monolith.md)
  - [0004 - Auth.js v5](docs/adr/0004-auth-library.md)
  - [0005 - Postgres over MySQL](docs/adr/0005-postgres-over-mysql.md)
  - [0006 - Prisma over TypeORM](docs/adr/0006-prisma-over-typeorm.md)
  - [0007 - Brevo for email](docs/adr/0007-email-brevo.md)
  - [0008 - BullMQ on Redis for background jobs](docs/adr/0008-jobs-bullmq.md)
  - [0009 - Audit log pattern](docs/adr/0009-audit-log-pattern.md)
  - [0010 - IONOS single-box hosting for Phase 1, with re-platform trigger](docs/adr/0010-hosting-ionos.md)
  - [0011 - Secrets management (PM2 ecosystem files now, AWS Secrets Manager before first paid visit)](docs/adr/0011-secrets-management.md)

### Brand and design

- [`packages/content/README.md`](packages/content/README.md) - how the content strings system works.
- Logo, colour, and typography source files live in [`docs/brand/`](docs/brand/). The Brand Guidelines and Brand Voice long-form documents will land in the same folder before the marketing site goes live.

### Compliance

- [`docs/compliance/DPIA.md`](docs/compliance/DPIA.md) - Data Protection Impact Assessment.
- [`docs/compliance/safeguarding-policy.md`](docs/compliance/safeguarding-policy.md) - Safeguarding policy v1.
- [`docs/compliance/companion-engagement.md`](docs/compliance/companion-engagement.md) - Companion employment status, IR35 position.

### Operations

- [`docs/runbooks/`](docs/runbooks/) - incident response, database restore, deploy and rollback, on-call expectations, DBS renewal workflow.

---

## A note on this document

This README is alive. If something in it is wrong, fix it in the same PR
that taught you it was wrong. If something is missing, add it. If a section
has not been updated in three months and the underlying thing has changed,
it is your problem now.

The test of a useful README is whether you can come back to it in three
months, after a holiday, and be productive again in under two hours. Hold
yourself to that test.

---

You are in good company.
