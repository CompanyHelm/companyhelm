ALTER TABLE "message_contents" ADD COLUMN "structured_content" jsonb;--> statement-breakpoint
ALTER TABLE "message_contents" ADD COLUMN "structured_content_type" text;