-- M.2.1: schema delta for direct family <-> companion messaging.
--
-- 1. Introduce ThreadKind enum to distinguish OPS_FAMILY, OPS_COMPANION,
--    and the new FAMILY_COMPANION threads.
-- 2. Backfill kind on existing rows from the partyRole snapshot.
-- 3. Relax operatorId / partyId / partyRole to NULL so a FAMILY_COMPANION
--    thread can omit them (those threads are participant <-> participant,
--    not operator <-> party).
-- 4. Add familyUserId / companionUserId plus per-side read +
--    notified-at timestamps for direct threads.
-- 5. Add Companion.directMessagingEnabled - the operator_admin gate.
--
-- Per-row invariants enforced in app code (Prisma DSL can't express
-- mutually-exclusive nullable groups):
--   kind = OPS_FAMILY       -> operatorId NOT NULL, partyId NOT NULL,
--                              familyUserId NULL, companionUserId NULL
--   kind = OPS_COMPANION    -> same as OPS_FAMILY
--   kind = FAMILY_COMPANION -> operatorId NULL, partyId NULL,
--                              familyUserId NOT NULL, companionUserId NOT NULL

CREATE TYPE "ThreadKind" AS ENUM ('OPS_FAMILY', 'OPS_COMPANION', 'FAMILY_COMPANION');

-- 1. Add kind (nullable initially so we can backfill) + new columns.
ALTER TABLE "Thread"
  ADD COLUMN "kind"                    "ThreadKind",
  ADD COLUMN "familyUserId"            TEXT,
  ADD COLUMN "companionUserId"         TEXT,
  ADD COLUMN "familyLastReadAt"        TIMESTAMP(3),
  ADD COLUMN "companionLastReadAt"     TIMESTAMP(3),
  ADD COLUMN "familyLastNotifiedAt"    TIMESTAMP(3),
  ADD COLUMN "companionLastNotifiedAt" TIMESTAMP(3);

-- 2. Backfill kind on existing rows. Every thread shipped before M.2.1
--    is operator-mediated; we read the partyRole snapshot to decide
--    which OPS_* variant.
UPDATE "Thread"
SET "kind" = CASE
  WHEN "partyRole" = 'family_member' THEN 'OPS_FAMILY'::"ThreadKind"
  WHEN "partyRole" = 'companion'     THEN 'OPS_COMPANION'::"ThreadKind"
END;

-- 3. Lock kind down + relax the operator-mediated columns so future
--    FAMILY_COMPANION rows can omit them.
ALTER TABLE "Thread"
  ALTER COLUMN "kind"       SET NOT NULL,
  ALTER COLUMN "operatorId" DROP NOT NULL,
  ALTER COLUMN "partyId"    DROP NOT NULL,
  ALTER COLUMN "partyRole"  DROP NOT NULL;

-- 4. FK constraints + indexes for the new participant columns.
ALTER TABLE "Thread"
  ADD CONSTRAINT "Thread_familyUserId_fkey"
    FOREIGN KEY ("familyUserId")    REFERENCES "User"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT "Thread_companionUserId_fkey"
    FOREIGN KEY ("companionUserId") REFERENCES "User"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE INDEX "Thread_kind_idx"
  ON "Thread"("kind");
CREATE INDEX "Thread_familyUserId_lastMessageAt_idx"
  ON "Thread"("familyUserId", "lastMessageAt" DESC);
CREATE INDEX "Thread_companionUserId_lastMessageAt_idx"
  ON "Thread"("companionUserId", "lastMessageAt" DESC);

-- 5. The operator_admin gate. Default false: no companion is reachable
--    directly until an admin explicitly enables it on the companion's
--    profile (M.2.2).
ALTER TABLE "Companion"
  ADD COLUMN "directMessagingEnabled" BOOLEAN NOT NULL DEFAULT false;
