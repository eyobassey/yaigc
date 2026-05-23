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

**Status**: all three portals plus the operator console are live in
production at [youareingoodcompany.co.uk](https://youareingoodcompany.co.uk)
(marketing + family + companion) and
[ops.youareingoodcompany.co.uk](https://ops.youareingoodcompany.co.uk)
(operator). Sign-in covers magic-link, password, and passkeys (WebAuthn).
Messaging is live with real-time WebSocket delivery, attachments, and a
15-min sender-side delete window (M.3): operator-mediated threads (M.1)
plus direct family ↔ companion threads gated per-companion by
`operator_admin` and shadowed read-only on an ops oversight tab (M.2).
The Shape-of-the-relationship work (Stage R) is in: family-payer
prose fields with edit history, companion "What matters about [name]"
block on every visit, operator fifth-visit reflection calls + quarterly
check-ins, brand-voice lint that catches goals/outcomes drift. Stripe
payments are the next major block. See
[Where things are](#where-things-are) below for the honest list of what is
built versus what is queued.

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
│       ├── prisma/
│       │   ├── schema.prisma       # Single-file Prisma schema
│       │   └── migrations/         # Version-controlled migrations
│       ├── src/
│       │   ├── app/                # App Router routes (one folder per surface)
│       │   │   ├── (marketing pages live at the apex: /, /how-it-works, /pricing, /safeguarding, /companions/join, /about, /privacy, /terms, /accessibility, /contact)
│       │   │   ├── companion/      # Companion portal (apex)
│       │   │   ├── family/         # Family portal (apex)
│       │   │   ├── ops/            # Operator console (served at ops.* via middleware host check)
│       │   │   ├── api/            # Auth callbacks (incl. WebAuthn), photo / document / message-attachment streaming routes, cron endpoints
│       │   │   ├── styleguide/     # Renders design tokens for QA
│       │   │   └── layout.tsx
│       │   ├── components/
│       │   │   ├── messaging/      # ThreadView (client) + emoji picker glue
│       │   │   └── ui/             # Shared primitives (Button, Paginator)
│       │   ├── lib/                # Server-side libraries (one file per concern)
│       │   │   ├── auth.ts, auth-helpers.ts, webauthn.ts
│       │   │   ├── prisma.ts, audit.ts
│       │   │   ├── companion*.ts, family*.ts, match.ts, subscription.ts, visit.ts
│       │   │   ├── safeguarding.ts, enquiry.ts, post-visit-report.ts
│       │   │   ├── messaging.ts, realtime.ts (Redis pub/sub publisher)
│       │   │   ├── message-attachment-storage.ts (S3 + magic-byte validation)
│       │   │   ├── badges.ts, pagination.ts, postcode-distance.ts
│       │   │   ├── visit-schedule.ts (BST-correct day boundaries)
│       │   │   ├── companion-photo-storage.ts, companion-document-storage.ts, visit-photo-storage.ts (S3)
│       │   │   └── email/          # Per-template builders, all using lib/email/_chrome.ts
│       │   └── middleware.ts       # Subdomain + role-based gate
│       ├── scripts/
│       │   └── realtime-server.ts  # Standalone WebSocket server; PM2 process igc-prod-realtime on :3004
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       └── package.json
├── packages/
│   ├── design-tokens/              # Brand colours, typography, spacing scale
│   └── content/                    # Customer-facing copy strings + brand-voice rules
├── deploy/
│   └── systemd/                    # yaigc-visit-reminders.* and yaigc-action-reminders.* unit files
├── docs/
│   ├── README.md                   # Pointers to the SDD + design system
│   ├── Solution_Design_Document_v1.pdf
│   ├── design-system/              # Tokens, components, AMENDMENTS.md
│   ├── adr/                        # Architectural Decision Records
│   ├── runbooks/                   # Operator and engineering runbooks (currently empty)
│   └── compliance/                 # GDPR / DPIA / safeguarding (currently empty)
├── scripts/
│   └── lint-content.ts             # Brand voice guard (forbidden words)
├── CHANGELOG.md                    # Per-stage commit log (added in May 2026)
├── package.json                    # Root pnpm workspace orchestration
├── pnpm-workspace.yaml
└── README.md                       # You are here
```

The original SDD anticipated a "modular monolith with eight bounded
contexts under `src/server/contexts/`" with `dependency-cruiser` keeping
them isolated. In practice the application has grown as a flat,
file-per-concern layout under `src/app/` and `src/lib/` and that is
working well at the current scale. See
[ADR 0002 — Flat layout, not bounded contexts](docs/adr/0002-flat-layout-not-bounded-contexts.md)
for the why and when to revisit.

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
| Auth | Auth.js v5 (NextAuth) | Magic link + email/password + passkeys (WebAuthn), 60-day database sessions, per-session device revoke |
| Realtime | `ws` + Redis pub/sub | Standalone Node process (`scripts/realtime-server.ts`) fronted by nginx `/realtime/` upgrade location. Server actions publish to `messaging:user:<id>` channels, the WS server fans out to connected sockets |
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

## How the code is organised

The application is a single Next.js 14 app. Code is grouped by concern in
two main folders:

- `apps/web/src/app/` — App Router routes, one folder per surface
  (`companion/`, `family/`, `ops/`, plus the marketing pages at the apex
  and `api/` for streaming + cron endpoints). Each route is a Server
  Component by default; client components are explicitly marked
  `'use client'`.
- `apps/web/src/lib/` — server-side libraries, one file per domain
  concern. The pattern is **a `lib/<thing>.ts` file owns the server
  actions, zod schemas, and audit calls for that thing**. Examples:
  `lib/match.ts` owns Match transitions, `lib/visit.ts` owns the visit
  state machine, `lib/companion.ts` owns the companion application
  pipeline and admin edit.

Cross-cutting bits:

| File / module | What it owns |
|---|---|
| `lib/auth.ts` + `lib/auth-helpers.ts` | Auth.js setup and the `requireOperator` / `requireFamilyMember` / `requireFamilyPayer` / `requireCompanion` guards |
| `lib/audit.ts` | Single `audit(...)` writer. Postgres triggers block UPDATE/DELETE on the table |
| `lib/email/` | Brevo email templates, all using a shared `_chrome.ts` renderer (HTML + plain text) |
| `lib/companion-photo-storage.ts`, `lib/companion-document-storage.ts`, `lib/visit-photo-storage.ts` | S3 helpers, paired with auth-gated `/api/<thing>/[id]` streaming routes |
| `lib/visit-schedule.ts` | BST-correct UK day boundaries and "next visit start" maths |
| `lib/pagination.ts` + `components/ui/Paginator.tsx` | Shared offset pagination |
| `lib/badges.ts` | Closed catalogue of operator-assigned companion badges + tier-from-visits helper |

The original SDD specification of "eight bounded contexts in
`src/server/contexts/` with `dependency-cruiser` enforcement" was not
implemented in favour of this flatter layout. See
[ADR 0002](docs/adr/0002-flat-layout-not-bounded-contexts.md) for the
reasoning and the trigger to revisit.

---

## Where things are

This section is honest about what is built, what is in progress, and what is
still empty. It is updated as Sprint 0 progresses and beyond.

### Built and working

> Tick each box only when the thing actually works in production, not when
> the PR is open. Last updated 2026-05-22.

**Infrastructure**

- [x] Repository (GitHub: `eyobassey/yaigc`, private; SSH push from box)
- [x] IONOS London VPS with Postgres 16 (PGDG), Redis 7, nginx, PM2
- [x] HTTPS end-to-end: Cloudflare Full (Strict) + 15-year Origin Cert
- [x] nginx hardening: HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- [x] `ops.youareingoodcompany.co.uk` subdomain served from same nginx, same origin cert (ADR 0001)
- [x] AWS S3 (`igc-app-files-prod`, eu-west-2) for visit photos, companion documents, and profile photos. Files are auth-gated via Next.js API routes — bucket itself stays private
- [x] systemd timers for cron: hourly visit reminders + hourly action reminders (matches / confirmations / overdue reports), with `Persistent=true` for missed-run catch-up
- [x] Standalone WebSocket realtime server (`apps/web/scripts/realtime-server.ts`) on `:3004`, fronted by nginx `/realtime/` upgrade location; PM2 process `igc-prod-realtime`. Redis pub/sub (`messaging:user:<id>`) fans out from server actions
- [ ] CI/CD pipeline (currently `pnpm build` + `pm2 restart igc-prod-web` on the box)
- [ ] Local development environment (Docker stack)

**Web platform foundations**

- [x] pnpm workspace: `apps/web` + `packages/content` + `packages/design-tokens`
- [x] Next.js 14 App Router, TypeScript strict
- [x] Tailwind CSS 3.4 sourced from design tokens
- [x] Self-hosted Fraunces + Inter via `next/font/google`
- [x] Design tokens (`packages/design-tokens`) with full brand palette
- [x] Content strings (`packages/content`) with brand voice guard
- [x] `/styleguide` route rendering tokens
- [x] Shared `PageShell` (Nav + footer + skip-link), `LongForm`, and `Paginator` primitives

**Marketing surface (Sprint 1)**

- [x] Home, `/how-it-works`, `/pricing`, `/safeguarding`, `/companions/join`
- [x] `/about`, `/privacy`, `/terms`, `/accessibility`
- [x] Public application form at `/companions/join/apply` (structured availability picker)
- [x] Public enquiry form at `/contact` → `Enquiry` triage queue in ops

**SEO + social**

- [x] `robots.txt`, `sitemap.xml`, `theme-color`, `apple-mobile-web-app-status-bar-style`
- [x] Open Graph + Twitter card defaults + per-page OG images via `next/og`
- [x] JSON-LD: LocalBusiness in root layout, FAQPage on home
- [x] Title template `%s · You Are In Good Company`

**Auth + accounts**

- [x] Auth.js v5 with `@auth/prisma-adapter`, database session strategy
- [x] Magic link via Brevo SMTP, branded HTML email
- [x] Email + password sign-in (P.1) with rate-limit and audit hooks
- [x] Passkeys / WebAuthn (P.2) — registration + sign-in flows under `/api/auth/webauthn/*`, can be revoked by operator_admin
- [x] 60-day sessions with "remember me", per-session device list with revoke from the account page (P.3)
- [x] Cross-subdomain cookie (`.youareingoodcompany.co.uk`) so the same session covers apex + ops + future `app.*`
- [x] `UserRole` enum at SDD spec: `family_payer`, `family_viewer`, `companion`, `operator`, `operator_admin`, `safeguarding_lead`, `finance`, `support`
- [x] Role-aware helpers in `lib/auth-helpers.ts`: `requireOperator`, `requireFamilyMember`, `requireFamilyPayer`, `requireCompanion`
- [x] Role-based middleware enforcing route-group access (apex portals + ops subdomain)
- [x] Append-only audit log (Postgres triggers block UPDATE/DELETE) wired into every state change; viewer at `/ops/audit`

**Operator console (`ops.youareingoodcompany.co.uk`)**

- [x] Today dashboard: enquiries, prospect families, new applications, open matches, visits today, missing reports, open safeguarding cases, pending family requests, compliance flags
- [x] Cross-console search field in the header (`/ops/search`) — Family / Recipient / Companion / Enquiry with deep links
- [x] Families list + detail + edit (address, consent, members, recipients, age display, sub change requests)
- [x] Companions list with tier pill + visit count + badge chips per row; detail with photo, RTW panel, documents, history, edit
- [x] Companion edit covers admin (name, borough, hourly rate, engagement, status, max concurrent matches) + profile (bio, interests, availability, photo with live preview) + driver's licence (number + expiry) + full home address + max travel miles + internal badges
- [x] Match flow: propose, accept, decline, un-match with cascade-cancel, accept/un-match emails
- [x] Subscription create-from-match, edit schedule, status transitions, change requests honoured
- [x] Visit state machine (`scheduled` → `confirmed` → `en_route` → `in_progress` → `completed` → `reported`, plus cancellations and no-shows). Manual and bulk visit generation
- [x] Visit calendar view at `/ops/visits/calendar` — week-at-a-glance (Mon–Sun, BST-correct)
- [x] Post-visit report submission with up to N photos (S3), redacted family summary email
- [x] Safeguarding cases: severity triage, escalation workflow, case notes, auto-open hooks
- [x] Compliance dashboard at `/ops/compliance` — DBS, insurance, driver's licence expired / ≤30 days / ≤90 days / missing, per-companion flag badges
- [x] Audit log viewer with offset pagination
- [x] Users section at `/ops/users` (O.14.x): list + detail; operator_admin can edit role + name, force sign-out, force-reset password, revoke passkey, soft-delete + restore
- [x] Analytics dashboard at `/ops/analytics` (O.15) — five inline-SVG charts (enquiries, matches, visits, reports, safeguarding), no new dependency
- [x] Operator account page at `/ops/account` (P.3.1) — security overview + sign-out
- [x] Messaging at `/ops/messages` (M.1) — operator-mediated threads with each family and each companion; unread counts in nav; every transition audit-logged
- [x] Direct F↔C oversight tab at `/ops/messages?tab=direct` (M.2.4) — read-only view of every FAMILY_COMPANION thread; every open audits a `read_sensitive` event on the thread; live updates via WebSocket fan-out to `operator_admin` users
- [x] Per-companion direct-messaging gate on `/ops/companions/[id]/edit` (M.2.2) — `operator_admin` only, audit-logged on every flip with before/after state
- [x] Today-dashboard relationship cards (R.5) — "Reflection calls due" (≥4 completed visits without a `fifth_visit` note) + "Check-ins due" (cadence-driven). Each row links into `/ops/families/[id]/log-call?kind=…`, which surfaces the family's prose + recent post-visit reports next to a textarea. Submit writes a `RelationshipNote`, bumps the right timestamp, and emails the family payer a warm note via the new `relationship-note` template
- [x] Family-detail surfaces for the relationship shape (R.4) — per-recipient "What matters about [name]" with collapsed revision history, family-level "What we are hoping for" with revisions, cadence dropdown (`Monthly / Quarterly default / Every six months / Annually / Off`, audit-logged), reflection-notes timeline
- [x] Pagination across every list page (offset, page=N) and every detail-page history feed (`hp=N`)

**Family portal (`/family`)**

- [x] Dashboard
- [x] Recipient view + edit (interests, mobility, dietary as tag pickers + free-text "Other")
- [x] Matched-companion view (gated, post-accept), photo via auth-gated route
- [x] Visits list + detail with reports + photos (auth-gated)
- [x] Subscription pause / cancel request flow
- [x] Match visibility: family sees proposed match, can accept or decline, with disambiguated "Accepted / Declined / Awaiting reply" labels
- [x] Account: name, relationship-to-recipient edit, self-serve "invite a family member"
- [x] Messaging at `/family/messages` (M.1 + M.2.3) — thread with the office plus, when the office has cleared it, a direct thread per matched companion. A "Start a direct thread" panel surfaces eligible matches that don't have a thread yet; threads flip read-only when the match ends or the gate is revoked, history preserved
- [x] Family-payer prose editors on `/family/recipient` (R.2) — autosave-on-blur textareas for "About [first name]" (per recipient) and "What we are hoping for" (per family). Helper prompts straight from memo §4.1.1 / §4.2.1. Every save that changes the body appends a `FamilyTextRevision`

**Companion portal (`/companion`)**

- [x] Dashboard
- [x] Application + RTW data + document uploads (passport, BRP, share code, visa letter, ILR, DBS, driver's licence, photo ID, proof of address, insurance, other)
- [x] Visits list + detail with state machine transitions (confirm, en-route, in-progress, completed, cancellations)
- [x] Self-submitted post-visit report (with photos) — `submittedByOperatorId` left NULL when self-submitted
- [x] Match accept / decline via portal, with the same emails as the operator path
- [x] Pre-accept travel-time estimate (postcodes.io + haversine) shown as "~25 min by car / ~40 by public transport / ~30 on foot" — no postcode leaked pre-accept
- [x] Profile edit: bio, photo (with live preview), interests, availability grid, driver's licence number + expiry, full home address, optional `maxTravelMiles`
- [x] Account view: read-only admin fields + sign-out card
- [x] Messaging at `/companion/messages` (M.1 + M.2.3) — thread with the office plus, when the office has cleared it, a direct thread per matched family. "Start a direct thread" panel for eligible matches without a thread; threads flip read-only on match-end or gate-revoke
- [x] "What matters about [name]" block on `/companion/visits/[id]` (R.3) — terracotta-rule card above the structured profile surfacing the family's latest prose. Hidden when the family has not written anything yet. `whatWeAreHopingFor` is deliberately not shown to the companion (memo §5.4)

**Cron / scheduled jobs**

- [x] Hourly visit reminders (24h before scheduled start, single-fire via `reminderSentAt`)
- [x] Hourly action reminders (24h after match proposal with no response from each side; 4h before unconfirmed visits; 4h after a completed visit with no report) — all single-fire via column flags

**Messaging + realtime**

- [x] Operator-mediated threads (M.1): Ops ↔ Family and Ops ↔ Companion, one thread per party, with `Thread` / `Message` / `ThreadReadState` models and unread badges across the nav
- [x] Real-time delivery (M.1.1): standalone WebSocket server on `:3004`, nginx `/realtime/` upgrade location, Redis pub/sub (`messaging:user:<id>`) fanning out from server actions; client hydrates `ThreadView` without refresh
- [x] Attachments + emoji picker (M.1.2): images (JPEG/PNG/WebP/HEIC, max 10 MB, EXIF preserved, HEIC→JPEG transcode), documents (PDF / Office / TXT / CSV, max 25 MB), videos (MP4/MOV/WebM, max 100 MB). Magic-byte validation, per-thread S3 prefix, auth-gated streaming, lazy-loaded emoji picker
- [x] Shape-of-the-relationship surfaces (R.1 → R.6): family-payer prose fields (`Recipient.aboutTheRecipient`, `Family.whatWeAreHopingFor`) with `FamilyTextRevision` edit history, companion `What matters about [name]` block on every visit, operator log-a-call workflow + Today-dashboard "due this week" cards driven by `Family.checkInCadenceDays` + `lastReflectionAt` / `lastCheckInAt`, `RelationshipNote` timeline on the family detail, brand-voice lint extension covering §6.2 of the design memo (goals / outcomes / progress / care plan / wellbeing score / intervention / treatment / therapy / programme + cousins)
- [x] Direct family ↔ companion threads (M.2.1 → M.2.5): new `ThreadKind` enum (`OPS_FAMILY` / `OPS_COMPANION` / `FAMILY_COMPANION`) with backfilled existing rows; `Companion.directMessagingEnabled` gates eligibility per-companion (operator_admin only). Find-or-create via `openDirectThread(matchId)`. Lifecycle derived at runtime from `Match.status` + `Companion.directMessagingEnabled` — match-ended OR gate-revoked flips the thread read-only without losing history. Email notify reuses the M.1 template with an optional `senderLabel`. Dismissible "office can read" disclosure banner on both participant sides (per-browser via `localStorage`), `Lock`-iconed "read-only" banner once lifecycle closes
- [x] Sender-side delete with a 15-minute window (M.3.1 → M.3.4): `Message.deletedAt` + `deletedByUserId` soft-delete columns; `deleteMessage(formData)` server action re-checks sender + window + idempotency on every call; audit log carries the original body in `metadata` so the message is reconstructible from the log alone. Real-time via a new `message-deleted` envelope on the existing Redis fan-out (the standalone realtime server is kind-agnostic, no restart there). `ThreadView` renders tombstones, listens for the WS event, and shows a `Trash2` button on own bubbles within the window. `operator_admin` viewing the FAMILY_COMPANION oversight surface sees the original body with strike-through + `[deleted by sender]` marker so safeguarding has full recovery

**Performance + caching**

- [x] `sharp` installed for next/image production optimisation
- [x] Long-cache headers (`max-age=31536000, immutable`) for `/logo`, `/photos`, `/fonts`
- [x] Explicit width/height on all `<img>` tags (CLS-protective)
- [x] Auth-gated photo routes use `Cache-Control: private, max-age=3600`

**Observability + legal (queued)**

- [ ] Sentry, PostHog (EU region, gated on cookie consent), Better Stack logging
- [ ] Cookie consent banner (PECR + UK GDPR)
- [ ] Real Companies House registration number + ICO registration number swapped in for the italic placeholders in /privacy and /terms

### In flight / next

- [ ] Stripe Subscriptions integration (family billing)
- [ ] Stripe Connect integration (companion payouts)
- [ ] Family billing surface (`/family/subscription` payments tab)
- [ ] Companion payouts surface (`/companion/payouts`)
- [ ] Brevo webhooks (delivery / open / click) feeding the operator audit log
- [ ] SMS reminders (Twilio) alongside the existing email cron
- [ ] DBS uCheck API integration (today the dashboard tracks expiry dates manually)
- [ ] Identity verification (Stripe Identity)
- [ ] Cookie consent + PostHog (EU region) once consent banner ships
- [ ] Credential rotations: burned Brevo SMTP, AWS access key, AUTH_SECRET, DB + Redis passwords

### Not yet started (Phase 2+)

- [ ] Public companion ratings (gated, moderated)
- [ ] Direct Payment invoicing (Care Act 2014)
- [ ] Block / mute on a direct F↔C thread (today only the operator_admin gate can stop one)
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
- **Goals / objectives / outcomes / progress / milestones / kpis / metrics / wellbeing score / intervention / treatment / therapy / programme** - the Shape-of-the-Relationship memo (§6.2). These belong to regulated social-care / clinical-care language and would drift the brand into CQC territory. Two narrow allow-list exceptions for the legitimate "naming what we are not" uses: `medical diagnoses or treatment` in `/privacy` and `nursing or therapy` in `/terms`.

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

| Environment | Hostname | Database | Redis | Port(s) | Process namespace |
|-------------|----------|----------|-------|---------|---------|
| Local (dev) | `localhost:3000` (loopback only) | Docker Postgres (`igc_dev`) | Docker Redis | 3000 web, 3004 realtime | `pnpm dev`, no PM2 |
| Staging | `staging.youareingoodcompany.co.uk` | Host Postgres (`igc_staging`) | Host Redis DB 1 | 3001 web | `igc-staging-*` |
| Production | `youareingoodcompany.co.uk` | Host Postgres (`igc_prod`) | Host Redis DB 0 | 3002 web, 3004 realtime | `igc-prod-web`, `igc-prod-realtime` |

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

- Auth.js v5 with database sessions (not JWT), 60-day cookie when "remember me" is selected.
- Sign-in methods: magic link, email + password, passkeys (WebAuthn). All sign-ins are audit-logged; failed attempts are rate-limited.
- Per-session device list with self-serve revoke. Operator_admin can force sign-out, force-reset password, or revoke a passkey on any user.
- SMS-based 2FA remains a Phase 2 option for operator-console roles once Twilio is integrated.

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

### Architecture

- [`docs/adr/`](docs/adr/) - Architectural Decision Records. The "why" behind each major decision.
  - [0001 - Operator console served from ops.* subdomain](docs/adr/0001-operator-subdomain.md)
  - [0002 - Flat layout, not bounded contexts](docs/adr/0002-flat-layout-not-bounded-contexts.md)
  - [0003 - S3 + auth-gated routes for user-uploaded files](docs/adr/0003-s3-auth-gated-file-storage.md)
  - [0004 - Offset pagination over cursor pagination](docs/adr/0004-offset-pagination.md)
  - [0005 - postcodes.io for pre-accept travel-time estimates](docs/adr/0005-postcodes-io-travel-estimate.md)
  - [0006 - Internal companion badging: tier + manual tags](docs/adr/0006-companion-badging.md)
- [`CHANGELOG.md`](CHANGELOG.md) - One entry per shipped stage, dated, with commit SHA.

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
