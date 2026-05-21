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

One ADR per major technology decision. Format: numbered (`0001-...`),
markdown, dated, with context / decision / consequences.

`adr/` is currently empty. First entries to write (per the SDD ToC):

- 0001 — Next.js 14 App Router, TS strict, Tailwind, shadcn/ui, tRPC, Zod
- 0003 — Modular monolith with 8 bounded contexts (dependency-cruiser)
- 0004 — Auth.js v5 with database sessions
- 0005 — PostgreSQL 16+ on the IONOS box (Phase 1)
- 0006 — Prisma as the ORM
- 0007 — Brevo for email (EU residency)
- 0008 — Inngest for background jobs
- 0010 — IONOS single-box hosting for Phase 1, with re-platform trigger

## Other folders

- `compliance/` — GDPR / DPIA / safeguarding-policy artefacts (currently
  empty; populated as those land).
- `runbooks/` — operational playbooks (origin cert renewal, DB backups, PM2
  process management, etc.). Currently empty.
