-- Match (SDD §12.4.5). Operator-proposed connection between a Family
-- Recipient and a Companion. Per DR-002, no self-serve matching in v1.

CREATE TYPE "MatchStatus" AS ENUM ('proposed', 'accepted', 'declined', 'withdrawn');

CREATE TABLE "Match" (
  "id"                   TEXT          PRIMARY KEY,
  "familyId"             TEXT          NOT NULL,
  "recipientId"          TEXT,
  "candidateCompanionId" TEXT          NOT NULL,
  "proposedByOperatorId" TEXT          NOT NULL,
  "status"               "MatchStatus" NOT NULL DEFAULT 'proposed',
  "rationale"            TEXT          NOT NULL,
  "familyResponseAt"     TIMESTAMP(3),
  "companionResponseAt"  TIMESTAMP(3),
  "declineReason"        TEXT,
  "createdAt"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "Match_familyId_fkey"             FOREIGN KEY ("familyId")             REFERENCES "Family"    ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Match_recipientId_fkey"          FOREIGN KEY ("recipientId")          REFERENCES "Recipient" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Match_candidateCompanionId_fkey" FOREIGN KEY ("candidateCompanionId") REFERENCES "Companion" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Match_proposedByOperatorId_fkey" FOREIGN KEY ("proposedByOperatorId") REFERENCES "User"      ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX "Match_familyId_status_idx"             ON "Match" ("familyId", "status");
CREATE INDEX "Match_candidateCompanionId_status_idx" ON "Match" ("candidateCompanionId", "status");
CREATE INDEX "Match_status_createdAt_idx"            ON "Match" ("status", "createdAt" DESC);
