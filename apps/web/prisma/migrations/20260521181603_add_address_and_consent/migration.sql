-- Migration: address + consent fields on Family/Recipient.
-- All new columns are nullable or have safe defaults so existing rows
-- (one prospect Family with one Recipient seeded earlier) keep working.

-- Family: billing address.
ALTER TABLE "Family"
  ADD COLUMN "billingAddressLine1" TEXT,
  ADD COLUMN "billingAddressLine2" TEXT,
  ADD COLUMN "billingCity"         TEXT,
  ADD COLUMN "billingPostcode"     TEXT,
  ADD COLUMN "billingCountry"      TEXT NOT NULL DEFAULT 'GB';

-- Recipient: visit address + three consent flags.
ALTER TABLE "Recipient"
  ADD COLUMN "addressLine1"            TEXT,
  ADD COLUMN "addressLine2"            TEXT,
  ADD COLUMN "addressCity"             TEXT,
  ADD COLUMN "addressPostcode"         TEXT,
  ADD COLUMN "addressCountry"          TEXT    NOT NULL DEFAULT 'GB',
  ADD COLUMN "consentToVisits"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentToPhotos"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentToReportSharing"  BOOLEAN NOT NULL DEFAULT true;
