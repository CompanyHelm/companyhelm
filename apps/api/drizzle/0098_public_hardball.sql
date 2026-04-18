ALTER TYPE "public"."artifact_scope" ADD VALUE 'session';--> statement-breakpoint
ALTER TABLE "artifacts" DROP CONSTRAINT "artifacts_scope_task_id_check";--> statement-breakpoint
ALTER TABLE "artifacts" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifacts_session_id_idx" ON "artifacts" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_scope_target_check" CHECK ((("artifacts"."scope_type")::text = 'company' AND "artifacts"."task_id" IS NULL AND "artifacts"."session_id" IS NULL) OR (("artifacts"."scope_type")::text = 'task' AND "artifacts"."task_id" IS NOT NULL AND "artifacts"."session_id" IS NULL) OR (("artifacts"."scope_type")::text = 'session' AND "artifacts"."task_id" IS NULL AND "artifacts"."session_id" IS NOT NULL));
