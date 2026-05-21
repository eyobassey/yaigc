-- PostVisitReportPhoto (SDD §12.4.4). Photo attachments for the
-- post-visit report. recipientConsentConfirmed required by law.
-- Files stored on disk; this table just keeps metadata.

CREATE TABLE "PostVisitReportPhoto" (
  "id"                        TEXT          PRIMARY KEY,
  "postVisitReportId"         TEXT          NOT NULL,
  "filename"                  TEXT          NOT NULL,
  "contentType"               TEXT          NOT NULL,
  "sizeBytes"                 INTEGER       NOT NULL,
  "recipientConsentConfirmed" BOOLEAN       NOT NULL DEFAULT false,
  "uploadedAt"                TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"                 TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostVisitReportPhoto_postVisitReportId_fkey"
    FOREIGN KEY ("postVisitReportId") REFERENCES "PostVisitReport"("id")
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "PostVisitReportPhoto_postVisitReportId_idx" ON "PostVisitReportPhoto" ("postVisitReportId");
