CREATE TYPE "public"."compute_provider" AS ENUM('e2b');--> statement-breakpoint
ALTER TABLE "agent_sandboxes" ADD COLUMN "provider" "compute_provider" DEFAULT 'e2b' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sandboxes" ALTER COLUMN "provider" DROP DEFAULT;--> statement-breakpoint
