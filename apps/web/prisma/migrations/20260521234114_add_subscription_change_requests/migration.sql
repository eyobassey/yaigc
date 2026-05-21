-- Family-facing pause / cancel requests on a Subscription. Family does
-- not change state directly; they flag intent, operator confirms via the
-- existing transition flow (which clears these fields on success).
ALTER TABLE "Subscription"
  ADD COLUMN "pauseRequestedAt"      TIMESTAMP(3),
  ADD COLUMN "pauseRequestedReason"  TEXT,
  ADD COLUMN "cancelRequestedAt"     TIMESTAMP(3),
  ADD COLUMN "cancelRequestedReason" TEXT;

-- Partial index for the operator Today tile / dashboard counts; lets us
-- 'where pauseRequestedAt is not null or cancelRequestedAt is not null'
-- efficiently as the table grows.
CREATE INDEX "Subscription_pendingRequest_idx"
  ON "Subscription" ("updatedAt" DESC)
  WHERE "pauseRequestedAt" IS NOT NULL OR "cancelRequestedAt" IS NOT NULL;
