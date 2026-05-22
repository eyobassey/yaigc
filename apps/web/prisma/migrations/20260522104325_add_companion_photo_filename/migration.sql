-- C.6: companion can upload their own profile photo. Server-generated
-- filename held here; bytes live in S3 under
-- companion-profiles/<companionId>/<filename>. The legacy photoUrl
-- column stays in place for any data that was set externally; the new
-- column is the canonical signal that an S3-backed photo exists.
ALTER TABLE "Companion" ADD COLUMN "photoFilename" TEXT;
