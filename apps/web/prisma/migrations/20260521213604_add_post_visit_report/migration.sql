-- PostVisitReport (SDD §12.4.3). One report per Visit (@unique on visitId).
-- v1: operator submits on behalf of the companion until the companion portal
-- lands in Phase 2.

CREATE TYPE "WellbeingRating" AS ENUM ('cheerful', 'quiet', 'tired', 'unwell', 'distressed', 'other');

CREATE TABLE "PostVisitReport" (
  "id"                    TEXT              PRIMARY KEY,
  "visitId"               TEXT              NOT NULL UNIQUE,
  "companionId"           TEXT              NOT NULL,
  "actualDurationMinutes" INTEGER           NOT NULL,
  "whatHappened"          TEXT              NOT NULL,
  "howWereThey"           "WellbeingRating" NOT NULL,
  "howWereTheyNote"       TEXT,
  "thingsToFlag"          TEXT,
  "submittedAt"           TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedByOperatorId" TEXT,
  "deliveredToFamilyAt"   TIMESTAMP(3),
  "createdAt"             TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3)      NOT NULL,
  CONSTRAINT "PostVisitReport_visitId_fkey"               FOREIGN KEY ("visitId")               REFERENCES "Visit"     ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "PostVisitReport_companionId_fkey"           FOREIGN KEY ("companionId")           REFERENCES "Companion" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "PostVisitReport_submittedByOperatorId_fkey" FOREIGN KEY ("submittedByOperatorId") REFERENCES "User"      ("id") ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX "PostVisitReport_companionId_submittedAt_idx" ON "PostVisitReport" ("companionId", "submittedAt" DESC);
CREATE INDEX "PostVisitReport_submittedAt_idx"             ON "PostVisitReport" ("submittedAt" DESC);
