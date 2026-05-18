CREATE TYPE "public"."schedule_type" AS ENUM('workflow', 'queued_agent_message');--> statement-breakpoint
CREATE TYPE "public"."schedule_run_status" AS ENUM('running', 'done', 'skipped', 'failed');--> statement-breakpoint
ALTER TYPE "public"."session_message_principal_type" ADD VALUE IF NOT EXISTS 'schedule';--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"type" "schedule_type" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
CREATE TABLE "queued_agent_message_schedules" (
	"schedule_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"cron_pattern" text NOT NULL,
	"timezone" text NOT NULL,
	"text" text NOT NULL,
	"should_steer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
CREATE TABLE "schedule_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"status" "schedule_run_status" DEFAULT 'running' NOT NULL,
	"bullmq_job_id" text,
	"workflow_run_id" uuid,
	"queued_message_id" uuid,
	"session_id" uuid,
	"skipped_reason" text,
	"error_message" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queued_agent_message_schedules" ADD CONSTRAINT "queued_agent_message_schedules_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queued_agent_message_schedules" ADD CONSTRAINT "queued_agent_message_schedules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queued_agent_message_schedules" ADD CONSTRAINT "queued_agent_message_schedules_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_runs" ADD CONSTRAINT "schedule_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_runs" ADD CONSTRAINT "schedule_runs_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_runs" ADD CONSTRAINT "schedule_runs_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_runs" ADD CONSTRAINT "schedule_runs_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedules_company_id_idx" ON "schedules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "schedules_company_enabled_idx" ON "schedules" USING btree ("company_id","enabled");--> statement-breakpoint
CREATE INDEX "queued_agent_message_schedules_company_id_idx" ON "queued_agent_message_schedules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "queued_agent_message_schedules_session_id_idx" ON "queued_agent_message_schedules" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "schedule_runs_company_id_idx" ON "schedule_runs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "schedule_runs_schedule_id_idx" ON "schedule_runs" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "schedule_runs_schedule_status_idx" ON "schedule_runs" USING btree ("schedule_id","status");--> statement-breakpoint
CREATE INDEX "schedule_runs_workflow_run_id_idx" ON "schedule_runs" USING btree ("workflow_run_id");--> statement-breakpoint
CREATE INDEX "schedule_runs_session_id_idx" ON "schedule_runs" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "schedules_company_scope_policy"
ON "schedules"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);--> statement-breakpoint
ALTER TABLE "queued_agent_message_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "queued_agent_message_schedules_company_scope_policy"
ON "queued_agent_message_schedules"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);--> statement-breakpoint
ALTER TABLE "schedule_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "schedule_runs_company_scope_policy"
ON "schedule_runs"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
