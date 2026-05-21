-- Migration: CompanionApplication + Companion per SDD §12.3.

CREATE TYPE "CompanionApplicationStatus" AS ENUM (
  'received', 'in_triage', 'phone_screen', 'interview', 'vetting',
  'complete', 'declined', 'withdrawn'
);

CREATE TYPE "CompanionStatus" AS ENUM (
  'onboarding', 'active', 'suspended', 'archived'
);

CREATE TYPE "CompanionBorough" AS ENUM (
  'south_manchester', 'trafford', 'stockport', 'salford'
);

CREATE TYPE "CompanionEngagementType" AS ENUM (
  'self_employed', 'worker', 'employed'
);

CREATE TABLE "CompanionApplication" (
  "id"                     TEXT                         PRIMARY KEY,
  "status"                 "CompanionApplicationStatus" NOT NULL DEFAULT 'received',
  "firstName"              TEXT                         NOT NULL,
  "lastName"               TEXT                         NOT NULL,
  "email"                  TEXT                         NOT NULL,
  "phone"                  TEXT                         NOT NULL,
  "postcode"               TEXT                         NOT NULL,
  "availabilitySummary"    TEXT                         NOT NULL,
  "whyJoinReason"          TEXT                         NOT NULL,
  "aboutYou"               TEXT                         NOT NULL,
  "rightToWork"            BOOLEAN                      NOT NULL,
  "backgroundCheckConsent" BOOLEAN                      NOT NULL,
  "triageNotes"            TEXT,
  "declineReason"          TEXT,
  "assignedToOperatorId"   TEXT,
  "createdAt"              TIMESTAMP(3)                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3)                 NOT NULL,
  "deletedAt"              TIMESTAMP(3)
);

CREATE INDEX "CompanionApplication_status_createdAt_idx"
  ON "CompanionApplication" ("status", "createdAt" DESC);
CREATE INDEX "CompanionApplication_email_idx"
  ON "CompanionApplication" ("email");

CREATE TABLE "Companion" (
  "id"                        TEXT                       PRIMARY KEY,
  "userId"                    TEXT                       NOT NULL,
  "applicationId"             TEXT                       NOT NULL,
  "status"                    "CompanionStatus"          NOT NULL DEFAULT 'onboarding',
  "firstName"                 TEXT                       NOT NULL,
  "lastName"                  TEXT                       NOT NULL,
  "photoUrl"                  TEXT,
  "bio"                       TEXT,
  "borough"                   "CompanionBorough"         NOT NULL,
  "interests"                 TEXT,
  "availability"              JSONB,
  "maxConcurrentMatches"      INTEGER                    NOT NULL DEFAULT 4,
  "dbsCertificateNumber"      TEXT,
  "dbsIssuedAt"               DATE,
  "dbsRenewalDueAt"           DATE,
  "insuranceProvider"         TEXT,
  "insuranceExpiresAt"        DATE,
  "stripeConnectedAccountId"  TEXT,
  "engagementType"            "CompanionEngagementType"  NOT NULL DEFAULT 'worker',
  "hourlyRate"                DECIMAL(10,2)              NOT NULL DEFAULT 12.00,
  "createdAt"                 TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3)               NOT NULL,
  "deletedAt"                 TIMESTAMP(3),
  CONSTRAINT "Companion_userId_fkey"        FOREIGN KEY ("userId")        REFERENCES "User" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "Companion_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CompanionApplication" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "Companion_userId_key"        ON "Companion" ("userId");
CREATE UNIQUE INDEX "Companion_applicationId_key" ON "Companion" ("applicationId");
CREATE INDEX        "Companion_status_idx"        ON "Companion" ("status");
CREATE INDEX        "Companion_borough_status_idx" ON "Companion" ("borough", "status");
CREATE INDEX        "Companion_dbsRenewalDueAt_idx" ON "Companion" ("dbsRenewalDueAt");
