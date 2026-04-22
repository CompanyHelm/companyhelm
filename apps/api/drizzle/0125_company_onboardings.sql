CREATE TYPE "public"."company_onboarding_status" AS ENUM('not_started', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TABLE "company_onboardings" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"status" "company_onboarding_status" DEFAULT 'not_started' NOT NULL,
	"agent_id" uuid,
	"session_id" uuid,
	"workflow_run_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"skipped_at" timestamp with time zone,
	"skipped_by_user_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD CONSTRAINT "company_onboardings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD CONSTRAINT "company_onboardings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD CONSTRAINT "company_onboardings_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD CONSTRAINT "company_onboardings_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD CONSTRAINT "company_onboardings_skipped_by_user_id_users_id_fk" FOREIGN KEY ("skipped_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_onboardings_agent_id_idx" ON "company_onboardings" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "company_onboardings_session_id_idx" ON "company_onboardings" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "company_onboardings_status_idx" ON "company_onboardings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "company_onboardings_workflow_run_id_idx" ON "company_onboardings" USING btree ("workflow_run_id");--> statement-breakpoint
INSERT INTO "company_onboardings" ("company_id", "status", "created_at", "updated_at")
SELECT "companies"."id", 'not_started', now(), now()
FROM "companies"
ON CONFLICT ("company_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "company_onboardings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_onboardings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "company_onboardings"', policy_record.policyname);
  END LOOP;
END
$$;--> statement-breakpoint
CREATE POLICY "company_onboardings_company_scope_policy"
ON "company_onboardings"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
