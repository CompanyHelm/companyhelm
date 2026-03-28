ALTER TYPE "public"."agent_sandbox_status" RENAME TO "agent_environment_status";--> statement-breakpoint
ALTER TABLE "agent_sandboxes" RENAME TO "agent_environments";--> statement-breakpoint
ALTER TABLE "agent_environments" RENAME COLUMN "provider_sandbox_id" TO "provider_environment_id";--> statement-breakpoint
ALTER TABLE "agent_environments" DROP CONSTRAINT "agent_sandboxes_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_environments" DROP CONSTRAINT "agent_sandboxes_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_environments" DROP CONSTRAINT "agent_sandboxes_current_session_id_agent_sessions_id_fk";
--> statement-breakpoint
DROP INDEX "agent_sandboxes_company_id_idx";--> statement-breakpoint
DROP INDEX "agent_sandboxes_agent_id_idx";--> statement-breakpoint
DROP INDEX "agent_sandboxes_current_session_id_idx";--> statement-breakpoint
DROP INDEX "agent_sandboxes_provider_sandbox_id_idx";--> statement-breakpoint
ALTER TABLE "agent_environments" ADD CONSTRAINT "agent_environments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_environments" ADD CONSTRAINT "agent_environments_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_environments" ADD CONSTRAINT "agent_environments_current_session_id_agent_sessions_id_fk" FOREIGN KEY ("current_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_environments_company_id_idx" ON "agent_environments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_environments_agent_id_idx" ON "agent_environments" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_environments_current_session_id_idx" ON "agent_environments" USING btree ("current_session_id");--> statement-breakpoint
CREATE INDEX "agent_environments_provider_environment_id_idx" ON "agent_environments" USING btree ("provider_environment_id");