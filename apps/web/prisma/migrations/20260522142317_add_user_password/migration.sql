-- P.1: optional password on User. NULL = magic-link only. argon2id hash.
ALTER TABLE "User"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "passwordSetAt" TIMESTAMP(3);
