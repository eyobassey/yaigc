# Changelog

One entry per shipped stage. Most recent at the top. Each entry has the
commit SHA, the date, the stage label, and a one-line summary. For the
full picture of a stage, read the commit message.

Format: `<sha> · <date> · <stage> — <summary>`

## 2026-05-23

- `06a265a` · ux — make the direct-thread "office can read" banner dismissible. New `DirectThreadOversightBanner` client component persists dismissal under `localStorage['igc.banner.direct-thread-oversight.dismissed']`; once dismissed it stays hidden across every direct thread on the same browser. Privacy policy + audit trail remain the canonical disclosure record. `EndedBanner` (lifecycle-closed read-only) stays non-dismissible — it represents current state, not a one-time notice
- `a51f1b4` · **M.3.4** — operator_admin on the FAMILY_COMPANION oversight tab sees the original body of every deleted message with `line-through` + 70% opacity + `[deleted by sender]` marker. Non-admin operators still see the tombstone. No new audit kind: the existing `direct_thread_read` event correlates with `message_deleted` entries to answer "which admin saw what was retracted"
- `b12b9b0` · **M.3.3** — `ThreadView` tombstone + delete button + WS hydration. New `deletedIds` runtime set populated by the `message-deleted` WS envelope OR a local optimistic flip when the sender clicks Trash; tombstone reads "Message deleted (by you)." for the sender, "Message deleted." for the counterpart. Tiny `Trash2` button next to the timestamp on own bubbles within the 15-min window
- `1cba00c` · **M.3.2** — `deleteMessage(formData)` server action: sender-only, 15-min window, idempotent (`!deletedAt` guard). Audit `actionType=delete`, `targetType=Message`, `metadata={ event:'message_deleted', threadId, threadKind, originalBody, attachmentCount }`. Realtime envelope is now a discriminated union (`NewMessageEnvelope` + `MessageDeletedEnvelope`); the standalone `igc-prod-realtime` server is kind-agnostic, so no restart there. Fan-out mirrors `sendMessage` (participants + operator_admins for direct threads)
- `49496e2` · **M.3.1** — schema groundwork for sender-side soft delete. New `Message.deletedAt DateTime?` + `Message.deletedByUserId String?` (FK to User) + `User.messagesDeleted Message[]` back-relation. Additive migration, no backfill. Body stays unchanged on delete so safeguarding can reconstruct via the audit log

## 2026-05-22

- `95e1aa0` · fix — operators streaming attachments on FAMILY_COMPANION threads were 403'd; widened the GET gate to allow `operator_*` roles (audit-logged as `read_sensitive` on `MessageAttachment`). Upload route stays restrictive
- `7a378b2` · **M.2.5** — lifecycle + email notifications + WS fan-out. Direct threads flip read-only when the parent Match ends or the gate is revoked (derived at runtime from `Match` + `Companion`, no schema change). New per-direction email notify reuses the M.1 template via a new optional `senderLabel`. Ops gets no per-message email; oversight covered by the dashboard + audit log
- `dc29185` · **M.2.4** — ops oversight: `/ops/messages` becomes tabbed (Operator threads + Direct F→C), `ThreadView` gains a `readOnly` prop, every operator open of a direct thread audits a `read_sensitive` event on `Thread`. WebSocket fan-out adds active `operator_admin` user IDs so the oversight surface is real-time
- `fa7c458` · fix — `/api/message-attachments` upload + stream routes were checking only `operatorId`/`partyId`; family + companion got 403s on attachments in direct threads. Widened the gate to the four participant columns
- `cbbd885` · refactor — move the direct-thread entry point off `/family/companion` and the companion match detail into a "Start a direct thread" panel at the top of `/family/messages` and `/companion/messages`. Eligibility check excludes pairs that already have a thread
- `bb5867a` · **M.2.3** — direct family ↔ companion thread UI. New `openDirectThread` server action (find-or-create from a matchId). `sendMessage` + `markThreadRead` extend to handle FAMILY_COMPANION participants. List + detail pages on both portals surface direct threads with a terracotta "Direct" pill and a disclosure banner. Email + WS to ops still deferred to M.2.5/M.2.4
- `0cb7135` · **M.2.2** — operator_admin toggle for direct messaging on `/ops/companions/[id]/edit`. New `setCompanionDirectMessaging` server action, hard-gated to `operator_admin`, audit-logged with before/after state and `event=direct_messaging_toggled`
- `ccaa134` · **M.2.1** — schema groundwork for direct family ↔ companion messaging. New `ThreadKind` enum (OPS_FAMILY, OPS_COMPANION, FAMILY_COMPANION) backfilled from the existing `partyRole` snapshot. `Thread` gains nullable `familyUserId` / `companionUserId` + per-side read/notified timestamps; `operatorId` / `partyId` / `partyRole` relaxed to NULL. `Companion.directMessagingEnabled` (default false) is the operator_admin gate
- `f37f98e` · **M.1.2** — message attachments (images, documents, videos up to 100 MB) + emoji picker. Magic-byte validation, EXIF preserved on images, HEIC→JPEG transcode, auth-gated S3 streaming. `nginx` body limit bumped to 110 MB on the upload route only
- `7c9492f` · fix — point `igc-prod-realtime` at the `tsx` ESM entry instead of the `.bin` wrapper so PM2 can boot the WebSocket server reliably
- `3140ea1` · **M.1.1** — real-time message delivery via WebSockets. New `igc-prod-realtime` PM2 process on `:3004` (`scripts/realtime-server.ts`), nginx `/realtime/` upgrade location, Redis pub/sub fan-out from server actions, client hook that hydrates `ThreadView` without a refresh
- `8c94ba1` · **M.1** — operator-mediated messaging: `/ops/messages`, `/family/messages`, `/companion/messages` with one thread per party (Ops ↔ Family, Ops ↔ Companion). New `Thread`, `Message`, `ThreadReadState` models, unread counts in nav, every transition audit-logged
- `c670079` · **O.15** — operator analytics dashboard at `/ops/analytics`: five charts (enquiries, matches, visits, reports, safeguarding) rendered as inline SVG with no new dependency
- `5ab57fe` · fix — drop stale Stage O.1 placeholder copy on the operator Today dashboard
- `ba59142` · **O.14.4** — user soft-delete + restore (operator_admin only); "Sign in" link added to the marketing home page
- `b3cd520` · **O.14.3** — user security actions: force sign-out, force-reset password, revoke passkey (operator_admin only)
- `b0596bd` · **O.14.2** — operator_admin can edit user role + name from `/ops/users/[id]`
- `2b1175b` · **O.14.1** — `/ops/users` section: list + detail, read-only, with role + last-sign-in
- `a792060` · **P.3.1** — operator account page at `/ops/account` (security overview + sign-out card)
- `7e984c3` · **P.3** — session polish: 60-day cookies, "remember me", device list with per-session revoke
- `bd26e33` · **P.2** — passkeys (WebAuthn) alongside password + magic-link, registration + sign-in flows under `/api/auth/webauthn/`
- `a5981ff` · **P.1** — email + password sign-in alongside magic-link, with rate-limit and audit hooks
- `489bb5f` · ops polish — show tier pill + visit count + manual badges on the `/ops/companions` list rows, across every status filter
- `a0f818a` · **O.13** — internal companion badging: live-computed tier (Bronze 5+ / Silver 25+ / Gold 100+) plus a closed catalogue of operator-assigned descriptive tags (skills, context, languages) in a new `CompanionBadge` table
- `704df14` · **O.12** — full home address on the Companion record (operator-only PII) + optional `maxTravelMiles`. Pre-accept travel estimate now prefers the Companion's own postcode
- `d1aa19a` · **O.11** — driver's licence number + expiry as structured columns, plus four new `CompanionDocumentKind` values (driver_licence, photo_id, proof_of_address, insurance_certificate). Compliance dashboard treats licence expiry like DBS/insurance
- `c5429dc` · **O.10** — operator companion edit page (`/ops/companions/[id]/edit`) covering admin and profile fields, with photo upload + live preview. Companion photo now renders on the ops detail page
- `7fe2357` · **O.9** — platform-wide pagination pass. New shared `Paginator` + `parsePagination` / `buildView`. Applied to every list page (ops + family + companion) and every detail-page history feed (`?hp=N`)
- `96f1b3b` · **O.8.4** — `/ops/visits/calendar` week-at-a-glance view, BST-correct Monday calculation
- `f72b897` · **O.8.3** — `/ops/compliance` dashboard with four buckets (expired / ≤30 days / ≤90 days / missing), per-companion flag badges, live Today tile
- `1cccdeb` · **O.8.2** — cross-console search field in the header (`/ops/search`) running four parallel queries
- `845a491` · **O.8.1** — bulk visit generation from a subscription (next 2 / 4 / 8 / 12, emails suppressed during a batch, single summary audit entry)
- `27b2232` · copy fix — relabel companion travel band from "transit" to "public transport"
- `8f7672e` · feature — pre-accept travel-time estimate on companion match detail (postcodes.io + haversine, no postcode leaked)
- `fc6360f` · **C.7** — companion account view: read-only admin fields + sign-out card
- `17fd61b` · ux — preview profile photo before save on the companion edit form
- `2094058` · **C.6** — companion profile edit (bio, photo, interests, availability). New `photoFilename` column, S3 storage at `companion-profiles/<id>/`, auth-gated streaming route
- `652047f` · **O.4.4** — action reminders cron: 24h after match proposal with no response (each side), 4h before unconfirmed visits, 4h after a completed visit with no report. Single-fire via column flags
- `9164da1` · fix — disambiguate match response labels (Accepted / Declined / Awaiting reply) instead of bare "Responded [date]"
- `87fc87d` · **F.7** — family-side match visibility, propose emails, one-open-match-per-family constraint
- `f76d22d` · **C.5** — companion match acceptance / decline via portal
- `ba9515a` · **C.4** — companion-submitted post-visit report with photo uploads (S3)
- `9624d4d` · **C.3** — companion-driven visit state machine transitions (mirror of operator transitions)
- `1e4da42` · **C.2** — companion visits list + read-only detail
- `2fd67d9` · **C.1.1** — right-to-work data + document uploads on companion application
- `9c3e54a` · **C.1** — companion portal foundation (auth, layout, dashboard)
- `f239776` · refactor — extend tag pickers to the operator recipient edit
- `7130b5d` · **F.5.2** — mobility + dietary tag pickers, self-serve "invite a family member"
- `6ad8550` · **F.5.1** — smarter interests input, richer family account page

## 2026-05-21

- `d023f00` · **O.4.2** — 24h visit reminder emails via systemd timer
- `e07d3bf` · **O.4.1** — BST-correct day boundaries for "Today" queries (Today tile + visits list)
- `5be703f` · **O.4** — extract `Button` primitive and migrate marketing pages
- `2404544` · **O.7.4.2** — move post-visit-report photos to S3 (after photo was accidentally committed to git in the previous local-disk implementation)
- `5d1e9a3` · chore — gitignore `uploads/` and untrack the accidentally committed photo
- `4f59cdc` · **O.7.5** — `SafeguardingCase` model with severity triage, escalation workflow, case notes, auto-open hooks
- `d8a1bb0` · **O.7.4.1** — visit-started email + `PostVisitReportPhoto` model
- `db81ddc` · **O.7.4** — `PostVisitReport` model + redacted family summary email
- `8d49fed` · feature — operator can edit Visit + Subscription schedules
- `aa918cd` · **O.7.3** — `Visit` model + state machine + per-visit emails
- `7e743c8` · feature — un-match an accepted Match with cascade-cancel + emails
- `3704ad0` · **O.7.2.1** — email confirmations on match accept + subscription create
- `56dd135` · **O.7.2** — `Subscription` model + create-from-match flow
- `3fbc88d` · **O.7.1** — `Match` model + operator propose / accept / decline flow
- `ee2a4eb` · **O.6.1** — structured availability picker + 3-minute copy
- `7deddde` · **O.6** — `Companion` + `CompanionApplication` models + pipeline
- `abb6512` · **O.5.3** — age display + add-member + add-recipient
- `d21c567` · **O.5.2** — edit + address + consent on Family / Recipient / FamilyMember
- `a7d5537` · **O.5.1** — payer welcome email on Family conversion
- `af378bc` · **O.5** — `Family` + `Recipient` + `FamilyMember` models + convert-from-enquiry flow
- `3a025b1` · **O.3.2** — mobile-responsive operator console
- `f6165e7` · **O.3.1** — enquiry confirmation email + operator note on transitions
- `3f339c1` · **O.3** — `Enquiry` model + public `/contact` + operator triage
- `a0a0cff` · fix — pass `/logo` `/photos` `/fonts` `/email` through middleware; mark redirects no-store
- `236b650` · **O.2** — ADR 0001 + audit log foundation
- `dd79fa2` · **O.1** — operator subdomain + role gate + empty Today dashboard
- `bb5c786` · **Chunk 4** — Postgres 16, Prisma schema v0, Auth.js v5 magic link, `/me`
- `52d6f75` · brand — horizontal full-name lockup + branded magic-link email
- `07a15dd` · icons — adopt lucide-react site-wide; retire Unicode glyphs
- `606e100` · perf — long cache headers, explicit `<img>` dimensions
- `a974655` · seo — per-page OG images with real Fraunces italic + FAQPage schema
- `eec99d8` · seo — JSON-LD LocalBusiness, theme-color, nav a11y
- `fa9de91` · seo — sitemap, robots, OG image, title template
- `d5eedbe` · **Sprint 1** — marketing pages (`/`, `/how-it-works`, `/pricing`, `/safeguarding`, `/companions/join`, `/about`, `/privacy`, `/terms`, `/accessibility`), hero photo, deploy config

## 2026-05-18

- `974856b` · scaffold — pnpm workspace, Next.js 14 app, marketing landing page
