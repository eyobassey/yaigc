-- O.13: CompanionBadge - internal descriptive labels operators attach
-- to a companion. Skills, languages, contexts. Not visible to families.
-- Tier-by-visit-count is derived live, not stored.

CREATE TABLE "CompanionBadge" (
  "id"                  TEXT PRIMARY KEY,
  "companionId"         TEXT NOT NULL,
  "slug"                TEXT NOT NULL,
  "awardedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "awardedByOperatorId" TEXT,

  CONSTRAINT "CompanionBadge_companionId_fkey"
    FOREIGN KEY ("companionId") REFERENCES "Companion"("id") ON DELETE CASCADE,
  CONSTRAINT "CompanionBadge_awardedByOperatorId_fkey"
    FOREIGN KEY ("awardedByOperatorId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "CompanionBadge_companionId_slug_key"
  ON "CompanionBadge"("companionId", "slug");
CREATE INDEX "CompanionBadge_slug_idx" ON "CompanionBadge"("slug");
