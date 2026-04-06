ALTER TABLE "session_queued_messages"
  ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "session_queued_messages"
  ADD COLUMN "dispatched_at" timestamp with time zone;
