CREATE TYPE "public"."session_message_principal_type" AS ENUM('user', 'task', 'workflow', 'agent_message');--> statement-breakpoint
ALTER TABLE "session_messages" ADD COLUMN "principal_type" "session_message_principal_type" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "session_messages" ADD COLUMN "principal_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "session_messages" ADD COLUMN "principal_session_id" uuid;--> statement-breakpoint
ALTER TABLE "session_messages" ADD COLUMN "task_run_id" uuid;--> statement-breakpoint
ALTER TABLE "session_messages" ADD COLUMN "workflow_run_id" uuid;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD COLUMN "principal_type" "session_message_principal_type" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD COLUMN "principal_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD COLUMN "principal_session_id" uuid;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD COLUMN "task_run_id" uuid;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD COLUMN "workflow_run_id" uuid;--> statement-breakpoint
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_principal_agent_id_agents_id_fk" FOREIGN KEY ("principal_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_principal_session_id_agent_sessions_id_fk" FOREIGN KEY ("principal_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD CONSTRAINT "session_queued_messages_principal_agent_id_agents_id_fk" FOREIGN KEY ("principal_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD CONSTRAINT "session_queued_messages_principal_session_id_agent_sessions_id_fk" FOREIGN KEY ("principal_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_messages_principal_agent_id_idx" ON "session_messages" USING btree ("principal_agent_id");--> statement-breakpoint
CREATE INDEX "session_messages_principal_session_id_idx" ON "session_messages" USING btree ("principal_session_id");--> statement-breakpoint
CREATE INDEX "session_messages_principal_type_idx" ON "session_messages" USING btree ("principal_type");--> statement-breakpoint
CREATE INDEX "session_messages_task_run_id_idx" ON "session_messages" USING btree ("task_run_id");--> statement-breakpoint
CREATE INDEX "session_messages_workflow_run_id_idx" ON "session_messages" USING btree ("workflow_run_id");
