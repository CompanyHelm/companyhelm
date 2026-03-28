CREATE TYPE "public"."agent_environment_lease_state" AS ENUM('active', 'idle', 'released', 'expired');--> statement-breakpoint
CREATE TYPE "public"."agent_environment_platform" AS ENUM('linux', 'windows', 'macos');--> statement-breakpoint
ALTER TYPE "public"."agent_environment_status" ADD VALUE 'provisioning' BEFORE 'running';--> statement-breakpoint
ALTER TYPE "public"."agent_environment_status" ADD VALUE 'available' BEFORE 'running';--> statement-breakpoint
ALTER TYPE "public"."agent_environment_status" ADD VALUE 'unhealthy';--> statement-breakpoint
ALTER TYPE "public"."agent_environment_status" ADD VALUE 'deleting';--> statement-breakpoint
CREATE TABLE "agent_environment_leases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"state" "agent_environment_lease_state" NOT NULL,
	"owner_token" text,
	"acquired_at" timestamp with time zone NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_environments" DROP CONSTRAINT "agent_environments_current_session_id_agent_sessions_id_fk";
--> statement-breakpoint
DROP INDEX "agent_environments_current_session_id_idx";--> statement-breakpoint
DROP INDEX "agent_environments_provider_environment_id_idx";--> statement-breakpoint
ALTER TABLE "agent_environments" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "agent_environments" ADD COLUMN "platform" "agent_environment_platform" DEFAULT 'linux' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_environments" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_environments" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agent_environment_leases" ADD CONSTRAINT "agent_environment_leases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_environment_leases" ADD CONSTRAINT "agent_environment_leases_environment_id_agent_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."agent_environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_environment_leases" ADD CONSTRAINT "agent_environment_leases_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_environment_leases" ADD CONSTRAINT "agent_environment_leases_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_environment_leases_company_id_idx" ON "agent_environment_leases" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_environment_leases_environment_id_idx" ON "agent_environment_leases" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "agent_environment_leases_agent_id_idx" ON "agent_environment_leases" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_environment_leases_session_id_idx" ON "agent_environment_leases" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "agent_environment_leases_state_expires_at_idx" ON "agent_environment_leases" USING btree ("state","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_environment_leases_open_environment_uidx" ON "agent_environment_leases" USING btree ("environment_id") WHERE "agent_environment_leases"."state" in ('active', 'idle');--> statement-breakpoint
CREATE INDEX "agent_environments_provider_environment_id_idx" ON "agent_environments" USING btree ("provider","provider_environment_id");--> statement-breakpoint
ALTER TABLE "agent_environments" ALTER COLUMN "platform" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "agent_environments" ALTER COLUMN "metadata" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "agent_environments" DROP COLUMN "current_session_id";--> statement-breakpoint
ALTER TABLE "agent_environments" DROP COLUMN "lease_expires_at";--> statement-breakpoint
ALTER TABLE "agent_environments" DROP COLUMN "last_used_at";
