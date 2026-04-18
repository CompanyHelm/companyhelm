ALTER TABLE "routine_cron_triggers" ADD COLUMN IF NOT EXISTS "start_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "routine_cron_triggers" ADD COLUMN IF NOT EXISTS "end_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "routine_cron_triggers" ADD COLUMN IF NOT EXISTS "limit" integer;
