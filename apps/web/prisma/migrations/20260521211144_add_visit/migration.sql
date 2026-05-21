-- Visit (SDD §12.4.2). One row per companionship visit, generated from a
-- Subscription's recurring schedule. State machine per SDD §11.1.

CREATE TYPE "VisitState" AS ENUM (
  'scheduled',
  'confirmed',
  'en_route',
  'in_progress',
  'completed',
  'reported',
  'cancelled_by_family',
  'cancelled_by_companion',
  'cancelled_by_operator',
  'no_show_companion',
  'no_show_recipient'
);

CREATE TYPE "CancellationActor" AS ENUM ('family', 'companion', 'operator');

CREATE TABLE "Visit" (
  "id"                       TEXT                PRIMARY KEY,
  "subscriptionId"           TEXT                NOT NULL,
  "familyId"                 TEXT                NOT NULL,
  "recipientId"              TEXT                NOT NULL,
  "companionId"              TEXT                NOT NULL,
  "state"                    "VisitState"        NOT NULL DEFAULT 'scheduled',
  "scheduledStartAt"         TIMESTAMP(3)        NOT NULL,
  "scheduledDurationMinutes" INTEGER             NOT NULL,
  "actualStartAt"            TIMESTAMP(3),
  "actualEndAt"              TIMESTAMP(3),
  "agreedActivity"           TEXT,
  "safetyFlags"              TEXT,
  "cancellationReason"       TEXT,
  "cancellationActor"        "CancellationActor",
  "stateChangedAt"           TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"                TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3)        NOT NULL,
  CONSTRAINT "Visit_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Visit_familyId_fkey"       FOREIGN KEY ("familyId")       REFERENCES "Family"       ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Visit_recipientId_fkey"    FOREIGN KEY ("recipientId")    REFERENCES "Recipient"    ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Visit_companionId_fkey"    FOREIGN KEY ("companionId")    REFERENCES "Companion"    ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX "Visit_state_scheduledStartAt_idx"          ON "Visit" ("state", "scheduledStartAt");
CREATE INDEX "Visit_subscriptionId_scheduledStartAt_idx" ON "Visit" ("subscriptionId", "scheduledStartAt" DESC);
CREATE INDEX "Visit_companionId_scheduledStartAt_idx"    ON "Visit" ("companionId", "scheduledStartAt");
CREATE INDEX "Visit_familyId_scheduledStartAt_idx"       ON "Visit" ("familyId", "scheduledStartAt");
