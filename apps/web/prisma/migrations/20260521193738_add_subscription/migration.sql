-- Subscription (SDD §12.4.1). The recurring schedule a Family pays for.
-- Pins one Recipient to one Companion at a fixed day, time, duration and
-- hourly rate. Visits (O.7.3) are generated from this.

CREATE TYPE "SubscriptionStatus"    AS ENUM ('active', 'paused', 'canceled');
CREATE TYPE "SubscriptionFrequency" AS ENUM ('weekly', 'biweekly', 'monthly');
CREATE TYPE "DayOfWeek"             AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');

CREATE TABLE "Subscription" (
  "id"                   TEXT                    PRIMARY KEY,
  "familyId"             TEXT                    NOT NULL,
  "recipientId"          TEXT                    NOT NULL,
  "companionId"          TEXT                    NOT NULL,
  "originatingMatchId"   TEXT                    UNIQUE,
  "status"               "SubscriptionStatus"    NOT NULL DEFAULT 'active',
  "frequency"            "SubscriptionFrequency" NOT NULL,
  "dayOfWeek"            "DayOfWeek"             NOT NULL,
  "startTime"            TEXT                    NOT NULL,
  "durationMinutes"      INTEGER                 NOT NULL,
  "hourlyRate"           DECIMAL(8,2)            NOT NULL,
  "stripeSubscriptionId" TEXT                    UNIQUE,
  "startedAt"            TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pauseStartAt"         TIMESTAMP(3),
  "pauseEndAt"           TIMESTAMP(3),
  "endedAt"              TIMESTAMP(3),
  "cancellationReason"   TEXT,
  "notes"                TEXT,
  "createdAt"            TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)            NOT NULL,
  CONSTRAINT "Subscription_familyId_fkey"           FOREIGN KEY ("familyId")           REFERENCES "Family"    ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Subscription_recipientId_fkey"        FOREIGN KEY ("recipientId")        REFERENCES "Recipient" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Subscription_companionId_fkey"        FOREIGN KEY ("companionId")        REFERENCES "Companion" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Subscription_originatingMatchId_fkey" FOREIGN KEY ("originatingMatchId") REFERENCES "Match"     ("id") ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX "Subscription_familyId_status_idx"    ON "Subscription" ("familyId", "status");
CREATE INDEX "Subscription_companionId_status_idx" ON "Subscription" ("companionId", "status");
CREATE INDEX "Subscription_status_dayOfWeek_idx"   ON "Subscription" ("status", "dayOfWeek");
