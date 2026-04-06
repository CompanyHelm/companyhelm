ALTER TABLE "session_queued_messages"
  ADD COLUMN IF NOT EXISTS "claimed_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "session_queued_messages"
  ADD COLUMN IF NOT EXISTS "dispatched_at" timestamp with time zone;
