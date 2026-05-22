-- M.1.2: file / photo / video attachments hung off a Message. Created
-- in two steps: pre-upload returns an unbound row (messageId null),
-- sendMessage's bind step sets messageId once the parent exists.
CREATE TABLE "MessageAttachment" (
  "id"               TEXT PRIMARY KEY,
  "threadId"         TEXT NOT NULL,
  "messageId"        TEXT,
  "uploadedById"     TEXT NOT NULL,
  "filename"         TEXT NOT NULL,
  "originalFilename" TEXT,
  "contentType"      TEXT NOT NULL,
  "sizeBytes"        INTEGER NOT NULL,
  "width"            INTEGER,
  "height"           INTEGER,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageAttachment_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE,
  CONSTRAINT "MessageAttachment_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE,
  CONSTRAINT "MessageAttachment_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
);
CREATE INDEX "MessageAttachment_threadId_idx" ON "MessageAttachment"("threadId");
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");
