-- Track whether the 24h reminder email has been sent for a Visit.
-- Idempotency for the hourly cron at /api/cron/visit-reminders.
ALTER TABLE "Visit" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
