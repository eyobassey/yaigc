-- SafeguardingCase + SafeguardingCaseNote (SDD §12.6).

CREATE TYPE "SafeguardingStatus"          AS ENUM ('open', 'under_review', 'actioned', 'closed');
CREATE TYPE "SafeguardingSeverity"        AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "SafeguardingClosureCategory" AS ENUM (
  'no_action_needed',
  'followed_up_with_family',
  'followed_up_with_companion',
  'companion_removed',
  'external_referral',
  'other'
);

CREATE TABLE "SafeguardingCase" (
  "id"                   TEXT                          PRIMARY KEY,
  "status"               "SafeguardingStatus"          NOT NULL DEFAULT 'open',
  "severity"             "SafeguardingSeverity"        NOT NULL DEFAULT 'medium',
  "summary"              TEXT                          NOT NULL,
  "subjectRecipientId"   TEXT,
  "relatedVisitId"       TEXT,
  "relatedReportId"      TEXT                          UNIQUE,
  "relatedMatchId"       TEXT                          UNIQUE,
  "openedAt"             TIMESTAMP(3)                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "openedByOperatorId"   TEXT,
  "assignedToOperatorId" TEXT,
  "closedAt"             TIMESTAMP(3),
  "closedByOperatorId"   TEXT,
  "closureCategory"      "SafeguardingClosureCategory",
  "closureNote"          TEXT,
  "createdAt"            TIMESTAMP(3)                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)                  NOT NULL,
  CONSTRAINT "SafeguardingCase_subjectRecipientId_fkey"   FOREIGN KEY ("subjectRecipientId")   REFERENCES "Recipient"       ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "SafeguardingCase_relatedVisitId_fkey"       FOREIGN KEY ("relatedVisitId")       REFERENCES "Visit"           ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "SafeguardingCase_relatedReportId_fkey"      FOREIGN KEY ("relatedReportId")      REFERENCES "PostVisitReport" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "SafeguardingCase_relatedMatchId_fkey"       FOREIGN KEY ("relatedMatchId")       REFERENCES "Match"           ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "SafeguardingCase_openedByOperatorId_fkey"   FOREIGN KEY ("openedByOperatorId")   REFERENCES "User"            ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "SafeguardingCase_closedByOperatorId_fkey"   FOREIGN KEY ("closedByOperatorId")   REFERENCES "User"            ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "SafeguardingCase_assignedToOperatorId_fkey" FOREIGN KEY ("assignedToOperatorId") REFERENCES "User"            ("id") ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX "SafeguardingCase_status_openedAt_idx"             ON "SafeguardingCase" ("status", "openedAt" DESC);
CREATE INDEX "SafeguardingCase_assignedToOperatorId_status_idx" ON "SafeguardingCase" ("assignedToOperatorId", "status");
CREATE INDEX "SafeguardingCase_subjectRecipientId_openedAt_idx" ON "SafeguardingCase" ("subjectRecipientId", "openedAt" DESC);
CREATE INDEX "SafeguardingCase_severity_status_idx"             ON "SafeguardingCase" ("severity", "status");

CREATE TABLE "SafeguardingCaseNote" (
  "id"               TEXT         PRIMARY KEY,
  "caseId"           TEXT         NOT NULL,
  "authorOperatorId" TEXT,
  "body"             TEXT         NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SafeguardingCaseNote_caseId_fkey"           FOREIGN KEY ("caseId")           REFERENCES "SafeguardingCase" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "SafeguardingCaseNote_authorOperatorId_fkey" FOREIGN KEY ("authorOperatorId") REFERENCES "User"             ("id") ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX "SafeguardingCaseNote_caseId_createdAt_idx" ON "SafeguardingCaseNote" ("caseId", "createdAt");
