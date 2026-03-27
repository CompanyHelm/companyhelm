ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "is_thinking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "thinking_text" text;--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "is_thinking" DROP DEFAULT;
