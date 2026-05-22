-- Right-to-work compliance fields + CompanionDocument model.

CREATE TYPE "RightToWorkType" AS ENUM (
  'british_irish_passport',
  'settled_status',
  'pre_settled_status',
  'skilled_worker_visa',
  'graduate_visa',
  'student_visa',
  'dependant_visa',
  'indefinite_leave_to_remain',
  'other'
);

CREATE TYPE "CompanionDocumentKind" AS ENUM (
  'passport',
  'brp',
  'share_code_pdf',
  'visa_letter',
  'ilr_document',
  'dbs_certificate',
  'other'
);

ALTER TABLE "CompanionApplication"
  ADD COLUMN "dateOfBirth"                     DATE,
  ADD COLUMN "rightToWorkType"                 "RightToWorkType",
  ADD COLUMN "rightToWorkShareCode"            TEXT,
  ADD COLUMN "rightToWorkExpiresAt"            DATE,
  ADD COLUMN "rightToWorkVerifiedAt"           TIMESTAMP(3),
  ADD COLUMN "rightToWorkVerifiedByOperatorId" TEXT,
  ADD COLUMN "rightToWorkVerificationNote"     TEXT,
  ADD CONSTRAINT "CompanionApplication_rightToWorkVerifiedByOperatorId_fkey"
    FOREIGN KEY ("rightToWorkVerifiedByOperatorId") REFERENCES "User"("id")
    ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX "CompanionApplication_rightToWorkVerifiedAt_idx"
  ON "CompanionApplication" ("rightToWorkVerifiedAt");

CREATE TABLE "CompanionDocument" (
  "id"                     TEXT                    PRIMARY KEY,
  "companionApplicationId" TEXT                    NOT NULL,
  "kind"                   "CompanionDocumentKind" NOT NULL,
  "filename"               TEXT                    NOT NULL,
  "contentType"            TEXT                    NOT NULL,
  "sizeBytes"              INTEGER                 NOT NULL,
  "description"            TEXT,
  "uploadedAt"             TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedByActorType"    "ActorType"             NOT NULL,
  "uploadedByActorId"      TEXT,
  "archivedAt"             TIMESTAMP(3),
  "archivedByOperatorId"   TEXT,
  "archivedReason"         TEXT,
  CONSTRAINT "CompanionDocument_companionApplicationId_fkey"
    FOREIGN KEY ("companionApplicationId") REFERENCES "CompanionApplication"("id")
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "CompanionDocument_companionApplicationId_uploadedAt_idx"
  ON "CompanionDocument" ("companionApplicationId", "uploadedAt" DESC);

CREATE INDEX "CompanionDocument_kind_uploadedAt_idx"
  ON "CompanionDocument" ("kind", "uploadedAt" DESC);
