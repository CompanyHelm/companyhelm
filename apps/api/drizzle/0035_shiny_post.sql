ALTER TABLE "session_messages" DROP COLUMN "is_thinking";--> statement-breakpoint
ALTER TABLE "session_messages" DROP COLUMN "thinking_text";--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "is_thinking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "thinking_text" text;--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "is_thinking" DROP DEFAULT;
