ALTER TABLE "artifacts" ADD COLUMN "created_by_session_id" uuid;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_created_by_session_id_agent_sessions_id_fk" FOREIGN KEY ("created_by_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifacts_created_by_session_id_idx" ON "artifacts" USING btree ("created_by_session_id");
