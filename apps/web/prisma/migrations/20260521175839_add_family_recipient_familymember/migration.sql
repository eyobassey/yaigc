-- Migration: add the Family / FamilyMember / Recipient models per
-- SDD §12.2 plus the supporting enums. Also adds an index on
-- Enquiry.convertedToFamilyId to support "show me the family this
-- enquiry became" lookups from the operator console.

CREATE TYPE "FamilyStatus" AS ENUM (
  'prospect',
  'active',
  'paused',
  'cancelled',
  'archived'
);

CREATE TYPE "FamilyMemberRole" AS ENUM ('payer', 'viewer');

CREATE TYPE "FamilyMemberRelationship" AS ENUM (
  'daughter',
  'son',
  'partner',
  'spouse',
  'sibling',
  'grandchild',
  'other'
);

CREATE TABLE "Family" (
  "id"                  TEXT           PRIMARY KEY,
  "status"              "FamilyStatus" NOT NULL DEFAULT 'prospect',
  "billingName"         TEXT           NOT NULL,
  "intakeNotes"         TEXT,
  "joinedAt"            TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt"         TIMESTAMP(3),
  "cancellationReason"  TEXT,
  "createdAt"           TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)   NOT NULL,
  "deletedAt"           TIMESTAMP(3)
);

CREATE INDEX "Family_status_createdAt_idx" ON "Family" ("status", "createdAt" DESC);

CREATE TABLE "FamilyMember" (
  "id"                       TEXT                       PRIMARY KEY,
  "familyId"                 TEXT                       NOT NULL,
  "userId"                   TEXT                       NOT NULL,
  "role"                     "FamilyMemberRole"         NOT NULL DEFAULT 'payer',
  "relationshipToRecipient"  "FamilyMemberRelationship",
  "isPrimaryContact"         BOOLEAN                    NOT NULL DEFAULT false,
  "addedAt"                  TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"                TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3)               NOT NULL,
  "deletedAt"                TIMESTAMP(3),
  CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "FamilyMember_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "User"   ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "FamilyMember_familyId_userId_key" ON "FamilyMember" ("familyId", "userId");
CREATE INDEX "FamilyMember_familyId_idx" ON "FamilyMember" ("familyId");
CREATE INDEX "FamilyMember_userId_idx"   ON "FamilyMember" ("userId");

CREATE TABLE "Recipient" (
  "id"                  TEXT          PRIMARY KEY,
  "familyId"            TEXT          NOT NULL,
  "firstName"           TEXT          NOT NULL,
  "lastName"            TEXT          NOT NULL,
  "preferredName"       TEXT,
  "dateOfBirth"         DATE,
  "phone"               TEXT,
  "pronouns"            TEXT,
  "interests"           TEXT,
  "thingsToKnow"        TEXT,
  "mobility"            TEXT,
  "healthNotes"         TEXT,
  "dietary"             TEXT,
  "religiousObservance" TEXT,
  "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)  NOT NULL,
  "deletedAt"           TIMESTAMP(3),
  CONSTRAINT "Recipient_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX "Recipient_familyId_idx" ON "Recipient" ("familyId");

CREATE INDEX "Enquiry_convertedToFamilyId_idx" ON "Enquiry" ("convertedToFamilyId");
