-- P.2: WebAuthn / passkey support. Authenticators are per-user-
-- registered credentials; WebAuthnChallenge holds short-lived,
-- single-use challenges for the registration + authentication dance.

CREATE TABLE "Authenticator" (
  "id"                   TEXT PRIMARY KEY,
  "userId"               TEXT NOT NULL,
  "credentialID"         TEXT NOT NULL UNIQUE,
  "credentialPublicKey"  BYTEA NOT NULL,
  "counter"              BIGINT NOT NULL DEFAULT 0,
  "credentialDeviceType" TEXT NOT NULL,
  "credentialBackedUp"   BOOLEAN NOT NULL,
  "transports"           TEXT,
  "nickname"             TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt"           TIMESTAMP(3),
  CONSTRAINT "Authenticator_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "Authenticator_userId_idx" ON "Authenticator"("userId");

CREATE TABLE "WebAuthnChallenge" (
  "id"        TEXT PRIMARY KEY,
  "challenge" TEXT NOT NULL UNIQUE,
  "userId"    TEXT,
  "email"     TEXT,
  "purpose"   TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "WebAuthnChallenge_expiresAt_idx" ON "WebAuthnChallenge"("expiresAt");
