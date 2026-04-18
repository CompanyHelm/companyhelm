CREATE TYPE "public"."routine_overlap_policy" AS ENUM('skip');--> statement-breakpoint
CREATE TYPE "public"."routine_run_source" AS ENUM('manual', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."routine_run_status" AS ENUM('queued', 'running', 'prompt_queued', 'skipped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."routine_trigger_type" AS ENUM('cron');--> statement-breakpoint
CREATE TABLE "routine_cron_triggers" (
	"trigger_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"cron_pattern" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "routine_cron_triggers_trigger_id_pk" PRIMARY KEY("trigger_id")
);
--> statement-breakpoint
CREATE TABLE "routine_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"routine_id" uuid NOT NULL,
	"trigger_id" uuid,
	"source" "routine_run_source" NOT NULL,
	"status" "routine_run_status" NOT NULL,
	"session_id" uuid,
	"bullmq_job_id" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_triggers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"routine_id" uuid NOT NULL,
	"type" "routine_trigger_type" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"instructions" text NOT NULL,
	"assigned_agent_id" uuid NOT NULL,
	"session_id" uuid,
	"enabled" boolean DEFAULT true NOT NULL,
	"overlap_policy" "routine_overlap_policy" DEFAULT 'skip' NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routine_cron_triggers" ADD CONSTRAINT "routine_cron_triggers_trigger_id_routine_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."routine_triggers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_cron_triggers" ADD CONSTRAINT "routine_cron_triggers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_runs" ADD CONSTRAINT "routine_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_runs" ADD CONSTRAINT "routine_runs_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_runs" ADD CONSTRAINT "routine_runs_trigger_id_routine_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."routine_triggers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_runs" ADD CONSTRAINT "routine_runs_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_triggers" ADD CONSTRAINT "routine_triggers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_triggers" ADD CONSTRAINT "routine_triggers_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_assigned_agent_id_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_cron_triggers_company_id_idx" ON "routine_cron_triggers" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "routine_cron_triggers_trigger_id_uidx" ON "routine_cron_triggers" USING btree ("trigger_id");--> statement-breakpoint
CREATE INDEX "routine_runs_company_id_idx" ON "routine_runs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "routine_runs_routine_created_at_idx" ON "routine_runs" USING btree ("routine_id","created_at");--> statement-breakpoint
CREATE INDEX "routine_runs_trigger_created_at_idx" ON "routine_runs" USING btree ("trigger_id","created_at");--> statement-breakpoint
CREATE INDEX "routine_runs_session_id_idx" ON "routine_runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "routine_triggers_company_id_idx" ON "routine_triggers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "routine_triggers_routine_id_idx" ON "routine_triggers" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX "routine_triggers_company_enabled_idx" ON "routine_triggers" USING btree ("company_id","enabled");--> statement-breakpoint
CREATE INDEX "routines_company_id_idx" ON "routines" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "routines_company_assigned_agent_id_idx" ON "routines" USING btree ("company_id","assigned_agent_id");--> statement-breakpoint
CREATE INDEX "routines_company_enabled_idx" ON "routines" USING btree ("company_id","enabled");--> statement-breakpoint
CREATE INDEX "routines_session_id_idx" ON "routines" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "routines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'routines'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "routines"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "routines_company_scope_policy"
ON "routines"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "routine_triggers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'routine_triggers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "routine_triggers"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "routine_triggers_company_scope_policy"
ON "routine_triggers"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "routine_cron_triggers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'routine_cron_triggers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "routine_cron_triggers"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "routine_cron_triggers_company_scope_policy"
ON "routine_cron_triggers"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "routine_runs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'routine_runs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "routine_runs"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "routine_runs_company_scope_policy"
ON "routine_runs"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
