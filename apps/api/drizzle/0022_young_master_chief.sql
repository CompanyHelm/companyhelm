CREATE TYPE "public"."agent_session_status" AS ENUM('running', 'stopped', 'archived');--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "status" "agent_session_status";--> statement-breakpoint
UPDATE "agent_sessions"
SET "status" = CASE
  WHEN "is_running" THEN 'running'::"agent_session_status"
  ELSE 'stopped'::"agent_session_status"
END;--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP COLUMN "is_running";
