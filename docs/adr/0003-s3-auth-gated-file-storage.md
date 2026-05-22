# ADR 0003: S3 + auth-gated Next.js routes for user-uploaded files

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-22 |
| **Deciders** | Bassey Eyo (founder), Engineering (lead) |
| **Supersedes** | Local-disk storage (used briefly during Stage O.7.4.1 and removed in O.7.4.2 after a photo was accidentally committed to git) |
| **Affected SDD sections** | §12.4 (Visits), §12.6 (Companions), §11 (Data protection) |

## Context

The platform handles three classes of user-uploaded file:

- **Post-visit report photos** (companion-uploaded after a visit).
- **Companion documents** (RTW, DBS, driver's licence, photo ID, proof of address, insurance certificate).
- **Companion profile photos** (companion- or operator-uploaded).

All three classes contain personal data; some are special-category.
Companions and families both need to see relevant photos within their
own portals. Operators need to see everything.

Three patterns were considered:

- **A. Local disk on the IONOS box.** Files stored at `apps/web/uploads/`,
  served by Next.js as static assets.
- **B. S3 public-read** with random, unguessable URLs.
- **C. S3 private** with auth-gated streaming via Next.js API routes.

## Decision

**Option C**: AWS S3 (`igc-app-files-prod`, `eu-west-2`), all objects
private, served through Next.js API routes that enforce per-request
authorisation.

## What we shipped

Three storage modules in `lib/`, all using the same shape:

- `lib/visit-photo-storage.ts` — prefix `post-visit-reports/<reportId>/`
- `lib/companion-document-storage.ts` — prefix `companion-documents/<applicationId>/`
- `lib/companion-photo-storage.ts` — prefix `companion-profiles/<companionId>/`

Each module exports `saveDocument(...)`, `readDocumentBytes(...)`,
`deleteDocumentFile(...)`, and a validation error type.

Each prefix has a matching auth-gated route under `src/app/api/`:

- `/api/visit-report-photos/[id]` — operator always; companion who
  owns the report always; family member only if the family is the
  visit's family AND recipient consent is on.
- `/api/companion-documents/[id]` — operator always; companion who
  owns the application always.
- `/api/companion-photos/[id]` — operator always; the companion
  themselves; any family member of a family with a proposed or
  accepted match against this companion.

Routes return `Cache-Control: private, max-age=3600` and the original
content type. Server-generated filenames (cuid-style) replace whatever
the client supplied.

## Alternatives considered

### A. Local disk

- ✅ Zero ops, zero new dependency, fastest to ship.
- ❌ Files become part of the deploy unit. A re-deploy that wipes the
  working tree wipes uploads (we hit this).
- ❌ Trivial to accidentally `git add -A` a directory of patient photos
  into the repository (we hit this; see commit `5d1e9a3`).
- ❌ No durability story. The IONOS box has no replication.
- ❌ Backups are bespoke; restoring is bespoke; PIM/audit story is bespoke.

Rejected after the git-leak incident in Stage O.7.4.1.

### B. S3 public-read with unguessable URLs

- ✅ Simplest possible serving path: families and companions get the
  bare S3 URL, no Next.js round-trip.
- ❌ Anyone with the URL can read forever, even after match is ended,
  even after subscription is cancelled, even if the URL leaks.
- ❌ No revocation. Object lifecycle policies are blunt instruments.
- ❌ Doesn't satisfy "personal data accessed by authorised parties only"
  in the DPIA.

Rejected on data-protection grounds.

### C. S3 private + auth-gated routes — chosen

- ✅ Authorisation is recomputed on every fetch. Revocation is the
  same as removing the relationship in the database.
- ✅ Operator-only by default; family/companion access is an explicit
  allow rule that mirrors the existing relationships (match, family,
  consent).
- ✅ Same S3 IAM credentials cover all three storage modules. One
  `S3Client` instance per module. No CORS headache.
- ⚠️ Every photo render is a round-trip through the Next.js server
  rather than a direct CDN hit. Acceptable at our caseload (~kilobytes
  per render, dozens per page); revisit if photo throughput becomes
  the bottleneck.

## Consequences

### Day-to-day

- `<img src={`/api/companion-photos/${companion.id}`}>` is the canonical
  pattern. The helper `lib/companion-photo-src.ts` builds the URL,
  falling back to the legacy `photoUrl` column for pre-S3 data.
- File validation lives in the storage module: type allow-list, size
  cap, custom `ValidationError` so server actions can surface a clean
  message back to the form.
- Deletes are eventual: rows reference an S3 key, the DELETE goes via
  the storage module, errors are logged but don't fail the transaction.

### Backups + retention

- S3 bucket has versioning enabled and a lifecycle to Glacier Deep
  Archive after 90 days for audit-relevant material.
- Retention rules (Care Act, HMRC) are enforced at the storage layer,
  not at the application layer — there is no soft-delete on the row
  to confuse them with.

### When to revisit

- If a deployed Next.js instance can no longer keep up with photo
  throughput. At that point, switch the route to issue **signed S3
  URLs** with a short TTL (5 minutes) instead of streaming the
  payload. The auth check stays; only the body transport changes.
- If a partnership requires geographic data residency outside eu-west-2.
