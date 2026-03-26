ALTER TYPE "public"."message_content_type" ADD VALUE 'toolCall';--> statement-breakpoint
ALTER TABLE "message_contents" ADD COLUMN "tool_call_id" text;--> statement-breakpoint
ALTER TABLE "message_contents" ADD COLUMN "tool_name" text;--> statement-breakpoint
ALTER TABLE "message_contents" ADD COLUMN "arguments" jsonb;--> statement-breakpoint
ALTER TABLE "session_messages" ADD COLUMN "is_thinking" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "session_messages" ADD COLUMN "thinking_text" text;