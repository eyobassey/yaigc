-- R.1: Shape of the relationship (design memo, May 2026).
--
-- Two prose fields family-payers can edit, both held lightly (no
-- length validation, no scoring, no measurement):
--   - Recipient.aboutTheRecipient   (companion-facing prose)
--   - Family.whatWeAreHopingFor     (operator-only prose)
--
-- Plus the cadence + bookkeeping columns the operator's quarterly
-- "how does it feel?" workflow needs:
--   - Family.checkInCadenceDays  (default 90 days; operator override)
--   - Family.lastReflectionAt    (fifth-visit call timestamp)
--   - Family.lastCheckInAt       (periodic check-in timestamp)
--
-- And two new tables:
--   - FamilyTextRevision  (append-only, drives change-over-time read)
--   - RelationshipNote    (operator-authored, free-text, no scoring)
--
-- The memo is explicit (s5.5) that this requires no new bounded
-- context, no new external integration, no new background-job
-- system. It deliberately does not introduce a goals/outcomes
-- framework or any measurement scaffolding.

-- 1. Family + Recipient column additions
ALTER TABLE "Family"
  ADD COLUMN "whatWeAreHopingFor" TEXT,
  ADD COLUMN "checkInCadenceDays" INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN "lastReflectionAt"   TIMESTAMP(3),
  ADD COLUMN "lastCheckInAt"      TIMESTAMP(3);

ALTER TABLE "Recipient"
  ADD COLUMN "aboutTheRecipient" TEXT;

-- 2. New enums
CREATE TYPE "FamilyTextRevisionField" AS ENUM (
  'aboutTheRecipient',
  'whatWeAreHopingFor'
);

CREATE TYPE "RelationshipNoteKind" AS ENUM (
  'fifth_visit',
  'check_in',
  'other'
);

-- 3. FamilyTextRevision - append-only edit history. recipientId is
--    NULL for whatWeAreHopingFor (per-family); populated for
--    aboutTheRecipient (per-recipient). Cascade-delete with the
--    parent family so a GDPR erasure cleans up the revisions too.
CREATE TABLE "FamilyTextRevision" (
  "id"           TEXT PRIMARY KEY,
  "familyId"     TEXT NOT NULL,
  "recipientId"  TEXT,
  "field"        "FamilyTextRevisionField" NOT NULL,
  "body"         TEXT NOT NULL,
  "authorUserId" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FamilyTextRevision_familyId_fkey"
    FOREIGN KEY ("familyId")     REFERENCES "Family"("id")
    ON DELETE CASCADE,
  CONSTRAINT "FamilyTextRevision_recipientId_fkey"
    FOREIGN KEY ("recipientId")  REFERENCES "Recipient"("id")
    ON DELETE CASCADE,
  CONSTRAINT "FamilyTextRevision_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "User"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE INDEX "FamilyTextRevision_familyId_field_createdAt_idx"
  ON "FamilyTextRevision"("familyId", "field", "createdAt" DESC);
CREATE INDEX "FamilyTextRevision_recipientId_createdAt_idx"
  ON "FamilyTextRevision"("recipientId", "createdAt" DESC);

-- 4. RelationshipNote - operator's free-text note from the
--    fifth-visit reflection call or the periodic check-in. There is
--    no scoring column, no satisfaction column, no progress column.
--    The memo is emphatic that measurement here would corrupt the
--    post-visit reports.
CREATE TABLE "RelationshipNote" (
  "id"             TEXT PRIMARY KEY,
  "familyId"       TEXT NOT NULL,
  "operatorUserId" TEXT NOT NULL,
  "callType"       "RelationshipNoteKind" NOT NULL,
  "body"           TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RelationshipNote_familyId_fkey"
    FOREIGN KEY ("familyId")       REFERENCES "Family"("id")
    ON DELETE CASCADE,
  CONSTRAINT "RelationshipNote_operatorUserId_fkey"
    FOREIGN KEY ("operatorUserId") REFERENCES "User"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE INDEX "RelationshipNote_familyId_createdAt_idx"
  ON "RelationshipNote"("familyId", "createdAt" DESC);
CREATE INDEX "RelationshipNote_callType_createdAt_idx"
  ON "RelationshipNote"("callType", "createdAt" DESC);
