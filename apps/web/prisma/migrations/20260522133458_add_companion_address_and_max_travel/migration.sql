-- O.12: full home address columns on Companion (operator-only PII).
-- maxTravelMiles is an optional companion-stated preference used by
-- future match filtering. All additive; existing rows remain valid.

ALTER TABLE "Companion"
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "addressCity" TEXT,
  ADD COLUMN "addressPostcode" TEXT,
  ADD COLUMN "addressCountry" TEXT NOT NULL DEFAULT 'GB',
  ADD COLUMN "maxTravelMiles" INTEGER;
