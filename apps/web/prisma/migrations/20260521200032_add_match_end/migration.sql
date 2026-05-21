-- Un-match (end an accepted Match). New status 'ended' is distinct from
-- 'declined'/'withdrawn' which are pre-acceptance outcomes.

ALTER TYPE "MatchStatus" ADD VALUE 'ended';

CREATE TYPE "MatchEndReason" AS ENUM (
  'not_a_fit',
  'scheduling_conflict',
  'recipient_circumstances_changed',
  'recipient_passed_away',
  'companion_circumstances_changed',
  'safeguarding_concern',
  'other'
);

ALTER TABLE "Match"
  ADD COLUMN "endedAt"           TIMESTAMP(3),
  ADD COLUMN "endReason"         "MatchEndReason",
  ADD COLUMN "endNote"           TEXT,
  ADD COLUMN "endedByOperatorId" TEXT,
  ADD CONSTRAINT "Match_endedByOperatorId_fkey"
    FOREIGN KEY ("endedByOperatorId") REFERENCES "User"("id")
    ON UPDATE CASCADE ON DELETE SET NULL;
