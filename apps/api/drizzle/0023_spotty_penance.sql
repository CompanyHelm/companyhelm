CREATE TYPE "public"."session_message_status" AS ENUM('running', 'completed');--> statement-breakpoint
ALTER TABLE "session_messages" ADD COLUMN "status" "session_message_status" NOT NULL;