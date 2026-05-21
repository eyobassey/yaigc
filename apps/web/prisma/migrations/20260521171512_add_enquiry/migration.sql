-- Migration: add the Enquiry model and its two enums.
-- Per SDD §12.10. Bounded to the marketing context. Lifecycle:
--   new -> triaged -> converted | closed.

CREATE TYPE "EnquirySource" AS ENUM ('contact_form', 'waitlist', 'companion_application');
CREATE TYPE "EnquiryStatus" AS ENUM ('new', 'triaged', 'converted', 'closed');

CREATE TABLE "Enquiry" (
  "id"                   TEXT             PRIMARY KEY,
  "source"               "EnquirySource"  NOT NULL,
  "name"                 TEXT             NOT NULL,
  "email"                TEXT             NOT NULL,
  "phone"                TEXT,
  "postcode"             TEXT,
  "message"              TEXT             NOT NULL,
  "status"               "EnquiryStatus"  NOT NULL DEFAULT 'new',
  "assignedToOperatorId" TEXT,
  "consentMarketing"     BOOLEAN          NOT NULL DEFAULT false,
  "convertedToFamilyId"  TEXT,
  "createdAt"            TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)     NOT NULL
);

CREATE INDEX "Enquiry_status_createdAt_idx" ON "Enquiry" ("status", "createdAt" DESC);
CREATE INDEX "Enquiry_source_createdAt_idx" ON "Enquiry" ("source", "createdAt" DESC);
CREATE INDEX "Enquiry_email_idx"            ON "Enquiry" ("email");
