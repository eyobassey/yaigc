-- M.3.1: sender-side soft delete on Message.
--
-- Additive. body stays unchanged so safeguarding investigations can
-- still read the original via the audit log, and operator_admins
-- viewing FAMILY_COMPANION threads on the oversight tab can render
-- the original with a strike-through marker. Hard erasure of body +
-- attachments is bundled with future GDPR right-to-erasure work, not
-- here.
--
-- deletedByUserId is FK'd to User so a future moderation feature can
-- reuse the column. Today the only writer is the sender themselves
-- via lib/messaging.ts:deleteMessage (M.3.2).

ALTER TABLE "Message"
  ADD COLUMN "deletedAt"       TIMESTAMP(3),
  ADD COLUMN "deletedByUserId" TEXT;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_deletedByUserId_fkey"
    FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE;
