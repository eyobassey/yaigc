-- Action-reminder cron idempotency timestamps. Each is single-fire:
-- the cron sets the column when the reminder email goes out and skips
-- the subject on subsequent runs.

ALTER TABLE "Match"
  ADD COLUMN "familyReminderSentAt"    TIMESTAMP(3),
  ADD COLUMN "companionReminderSentAt" TIMESTAMP(3);

ALTER TABLE "Visit"
  ADD COLUMN "confirmationReminderSentAt" TIMESTAMP(3),
  ADD COLUMN "reportReminderSentAt"       TIMESTAMP(3);
