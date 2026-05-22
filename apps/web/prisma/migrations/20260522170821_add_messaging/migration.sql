-- M.1: operator-mediated messaging. Two-party threads (operator + one
-- family_member OR companion user). Family <-> Companion direct
-- threads are deliberately not supported in v1 - the operator is
-- always in the loop. Per-side lastReadAt + lastNotifiedAt drive
-- unread badges and the 5-minute email-debounce.

CREATE TABLE "Thread" (
  "id"                     TEXT PRIMARY KEY,
  "subject"                TEXT,
  "operatorId"             TEXT NOT NULL,
  "partyId"                TEXT NOT NULL,
  "partyRole"              TEXT NOT NULL,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,
  "lastMessageAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "operatorLastReadAt"     TIMESTAMP(3),
  "partyLastReadAt"        TIMESTAMP(3),
  "operatorLastNotifiedAt" TIMESTAMP(3),
  "partyLastNotifiedAt"    TIMESTAMP(3),

  CONSTRAINT "Thread_operatorId_fkey"
    FOREIGN KEY ("operatorId") REFERENCES "User"("id"),
  CONSTRAINT "Thread_partyId_fkey"
    FOREIGN KEY ("partyId") REFERENCES "User"("id")
);
CREATE INDEX "Thread_operatorId_lastMessageAt_idx"
  ON "Thread"("operatorId", "lastMessageAt" DESC);
CREATE INDEX "Thread_partyId_lastMessageAt_idx"
  ON "Thread"("partyId", "lastMessageAt" DESC);

CREATE TABLE "Message" (
  "id"        TEXT PRIMARY KEY,
  "threadId"  TEXT NOT NULL,
  "senderId"  TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Message_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE,
  CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id")
);
CREATE INDEX "Message_threadId_createdAt_idx"
  ON "Message"("threadId", "createdAt" DESC);
