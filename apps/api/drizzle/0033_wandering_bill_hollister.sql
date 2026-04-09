CREATE TYPE "public"."agent_sandbox_status" AS ENUM('running', 'stopped');--> statement-breakpoint
CREATE TABLE "agent_sandboxes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"current_session_id" uuid,
	"lease_expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"status" "agent_sandbox_status" NOT NULL,
	"provider_sandbox_id" text NOT NULL,
	"cpu_count" integer NOT NULL,
	"memory_gb" integer NOT NULL,
	"disk_space_gb" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_sandboxes" ADD CONSTRAINT "agent_sandboxes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sandboxes" ADD CONSTRAINT "agent_sandboxes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sandboxes" ADD CONSTRAINT "agent_sandboxes_current_session_id_agent_sessions_id_fk" FOREIGN KEY ("current_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_sandboxes_company_id_idx" ON "agent_sandboxes" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_sandboxes_agent_id_idx" ON "agent_sandboxes" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_sandboxes_current_session_id_idx" ON "agent_sandboxes" USING btree ("current_session_id");--> statement-breakpoint
CREATE INDEX "agent_sandboxes_provider_sandbox_id_idx" ON "agent_sandboxes" USING btree ("provider_sandbox_id");
