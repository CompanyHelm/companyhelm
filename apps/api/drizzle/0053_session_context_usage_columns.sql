ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "current_context_tokens" integer;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "max_context_tokens" integer;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "is_compacting" boolean;--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "is_compacting" SET DEFAULT false;--> statement-breakpoint
UPDATE "agent_sessions" SET "is_compacting" = false WHERE "is_compacting" IS NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "is_compacting" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "is_compacting" DROP DEFAULT;
