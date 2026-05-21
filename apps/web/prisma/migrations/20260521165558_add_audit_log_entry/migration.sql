-- Migration: add the AuditLogEntry table with append-only enforcement.
--
-- Per SDD §12.7 and DR-008 ("audit log lives in the same Postgres with
-- role-enforced append-only behaviour"). We do not yet have a separate
-- database role for the application, so we enforce append-only via a
-- BEFORE UPDATE / BEFORE DELETE trigger that raises an exception. When
-- we later split the role (or rotate the yaigc role's grants), the
-- trigger remains as a belt-and-braces second layer.

CREATE TYPE "ActorType" AS ENUM ('user', 'system', 'integration');

CREATE TYPE "ActionType" AS ENUM (
  'create',
  'update',
  'delete',
  'read_sensitive',
  'state_change',
  'auth',
  'payment',
  'consent',
  'export'
);

CREATE TABLE "AuditLogEntry" (
  "id"          BIGSERIAL PRIMARY KEY,
  "occurredAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorType"   "ActorType"  NOT NULL,
  "actorId"     TEXT,
  "actorRole"   TEXT,
  "actionType"  "ActionType" NOT NULL,
  "targetType"  TEXT         NOT NULL,
  "targetId"    TEXT,
  "beforeState" JSONB,
  "afterState"  JSONB,
  "ip"          TEXT,
  "userAgent"   TEXT,
  "requestId"   TEXT,
  "metadata"    JSONB
);

-- Indexes mirror SDD §12.11 indexing strategy.
CREATE INDEX "AuditLogEntry_occurredAt_idx"             ON "AuditLogEntry" ("occurredAt" DESC);
CREATE INDEX "AuditLogEntry_actorId_occurredAt_idx"     ON "AuditLogEntry" ("actorId", "occurredAt" DESC);
CREATE INDEX "AuditLogEntry_targetType_targetId_idx"    ON "AuditLogEntry" ("targetType", "targetId");
CREATE INDEX "AuditLogEntry_actionType_occurredAt_idx"  ON "AuditLogEntry" ("actionType", "occurredAt" DESC);

-- Append-only enforcement. UPDATE and DELETE raise an exception so the
-- log can only grow. INSERT is the only allowed write.
CREATE OR REPLACE FUNCTION reject_audit_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLogEntry is append-only (per DR-008 / SDD §12.7); UPDATE and DELETE are forbidden';
END;
$$;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "AuditLogEntry"
  FOR EACH ROW
  EXECUTE FUNCTION reject_audit_modification();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "AuditLogEntry"
  FOR EACH ROW
  EXECUTE FUNCTION reject_audit_modification();
