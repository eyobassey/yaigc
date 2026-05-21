-- Migration: add structured availability slots alongside the human-readable
-- summary on CompanionApplication. Nullable so existing rows keep working;
-- the summary field is still required.
ALTER TABLE "CompanionApplication" ADD COLUMN "availabilitySlots" JSONB;
