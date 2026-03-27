CREATE TYPE "public"."compute_provider" AS ENUM('daytona');--> statement-breakpoint
ALTER TABLE "agent_sandboxes" RENAME COLUMN "daytona_sandbox_id" TO "provider_sandbox_id";--> statement-breakpoint
DROP INDEX "agent_sandboxes_daytona_sandbox_id_idx";--> statement-breakpoint
ALTER TABLE "agent_sandboxes" ADD COLUMN "provider" "compute_provider" DEFAULT 'daytona' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sandboxes" ALTER COLUMN "provider" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "agent_sandboxes_provider_sandbox_id_idx" ON "agent_sandboxes" USING btree ("provider_sandbox_id");
