DROP INDEX "threads_company_id_idx";--> statement-breakpoint
CREATE INDEX "agent_sessions_company_id_idx" ON "agent_sessions" USING btree ("company_id");