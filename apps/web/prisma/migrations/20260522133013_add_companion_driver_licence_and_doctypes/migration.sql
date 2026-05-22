-- O.11: capture driver's licence (number + expiry) on the Companion record,
-- plus new CompanionDocumentKind values for licence photo, photo ID, proof
-- of address, and insurance certificate. All additive; existing rows
-- remain valid because the new columns are nullable and enum additions
-- never invalidate existing data.

ALTER TABLE "Companion"
  ADD COLUMN "driverLicenceNumber" TEXT,
  ADD COLUMN "driverLicenceExpiresAt" DATE;

ALTER TYPE "CompanionDocumentKind" ADD VALUE IF NOT EXISTS 'driver_licence';
ALTER TYPE "CompanionDocumentKind" ADD VALUE IF NOT EXISTS 'photo_id';
ALTER TYPE "CompanionDocumentKind" ADD VALUE IF NOT EXISTS 'proof_of_address';
ALTER TYPE "CompanionDocumentKind" ADD VALUE IF NOT EXISTS 'insurance_certificate';
