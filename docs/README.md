# Reference documentation

Three categories live here. Treat them in this order of authority.

## 1. Solution Design Document (`Solution_Design_Document_v1.pdf`)

105 pages. The full design of the platform. Eighteen sections covering
context, personas, the four portals, cross-cutting domain logic, the data
model (25+ entities), integration specs, and 50+ numbered functional
requirements (FR-FAM, FR-COM, FR-OP, FR-BOOK, FR-PAY, FR-SAFE, FR-NOTIF,
FR-AUDIT) plus non-functional requirements (NFR-PERF, NFR-A11Y, NFR-SEC,
NFR-GDPR, NFR-OBS, NFR-REL, NFR-BROWSER).

**When to consult:** designing any new feature, writing migrations, picking
up a new bounded context, or any time a "should we do X?" question comes up
about scope or shape. Section 17 (decisions register) lists 15 numbered
decisions (DR-001 to DR-015) that are not to be revisited lightly.

## 2. Design System (`design-system/`)

The visual language. Tokens, components, patterns, naming conventions,
governance.

Start with `design-system/README.md`. The canonical doc is
`Design_System_v0.docx`. Every change since is in `AMENDMENTS.md`. The live
catalogue is `patterns.html`.

**When to consult:** before adding a component, adding a token, naming
something, or designing a new pattern.

## 3. Architectural Decision Records (`adr/`)

One ADR per major technology or design decision. Format: numbered
(`0001-...`), markdown, dated, with context / decision / alternatives
/ consequences / triggers to revisit.

Current ADRs (most recent first):

- [`0006-companion-badging.md`](adr/0006-companion-badging.md) — Internal companion badging: live-computed tier + manual descriptive tags
- [`0005-postcodes-io-travel-estimate.md`](adr/0005-postcodes-io-travel-estimate.md) — postcodes.io + haversine for pre-accept travel-time
- [`0004-offset-pagination.md`](adr/0004-offset-pagination.md) — Offset pagination platform-wide
- [`0003-s3-auth-gated-file-storage.md`](adr/0003-s3-auth-gated-file-storage.md) — S3 private + auth-gated Next.js API routes for all user-uploaded files
- [`0002-flat-layout-not-bounded-contexts.md`](adr/0002-flat-layout-not-bounded-contexts.md) — Why the flat `app/` + `lib/` layout, with a clear trigger to revisit
- [`0001-operator-subdomain.md`](adr/0001-operator-subdomain.md) — Operator console served from `ops.*` subdomain rather than a separate domain

Decisions still to record (in priority order):

- Stack choice (Next.js 14 App Router, TS strict, Tailwind, Auth.js v5, Prisma, Postgres, Brevo)
- Audit log pattern (Postgres triggers blocking UPDATE/DELETE)
- IONOS single-box hosting for Phase 1, with re-platform trigger
- Server actions over tRPC (the SDD anticipated tRPC; we went with App Router server actions)

## Other folders

- `compliance/` — GDPR / DPIA / safeguarding-policy artefacts (currently
  empty; populated as those land).
- `runbooks/` — operational playbooks (origin cert renewal, DB backups, PM2
  process management, etc.). Currently empty.
