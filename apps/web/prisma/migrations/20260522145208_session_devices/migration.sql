-- P.3: capture user-agent on session creation + track last-active for
-- the per-device list on each portal's account security section.
ALTER TABLE "Session"
  ADD COLUMN "userAgent"    TEXT,
  ADD COLUMN "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Session_userId_lastActiveAt_idx"
  ON "Session"("userId", "lastActiveAt" DESC);
