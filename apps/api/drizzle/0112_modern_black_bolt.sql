CREATE TYPE "public"."workflow_overlap_policy" AS ENUM('skip');--> statement-breakpoint
CREATE TYPE "public"."workflow_run_source" AS ENUM('manual', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."workflow_trigger_type" AS ENUM('cron');--> statement-breakpoint
CREATE TABLE "workflow_cron_triggers" (
	"trigger_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"cron_pattern" text NOT NULL,
	"timezone" text NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"limit" integer,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workflow_cron_triggers_trigger_id_pk" PRIMARY KEY("trigger_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_trigger_input_values" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"trigger_id" uuid NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_triggers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"workflow_definition_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"type" "workflow_trigger_type" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"overlap_policy" "workflow_overlap_policy" DEFAULT 'skip' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "trigger_id" uuid;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "source" "workflow_run_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_cron_triggers" ADD CONSTRAINT "workflow_cron_triggers_trigger_id_workflow_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."workflow_triggers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_cron_triggers" ADD CONSTRAINT "workflow_cron_triggers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_trigger_input_values" ADD CONSTRAINT "workflow_trigger_input_values_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_trigger_input_values" ADD CONSTRAINT "workflow_trigger_input_values_trigger_id_workflow_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."workflow_triggers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_triggers" ADD CONSTRAINT "workflow_triggers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_triggers" ADD CONSTRAINT "workflow_triggers_workflow_definition_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_triggers" ADD CONSTRAINT "workflow_triggers_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_cron_triggers_company_id_idx" ON "workflow_cron_triggers" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_cron_triggers_trigger_id_uidx" ON "workflow_cron_triggers" USING btree ("trigger_id");--> statement-breakpoint
CREATE INDEX "workflow_trigger_input_values_company_id_idx" ON "workflow_trigger_input_values" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "workflow_trigger_input_values_trigger_id_idx" ON "workflow_trigger_input_values" USING btree ("trigger_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_trigger_input_values_trigger_name_uidx" ON "workflow_trigger_input_values" USING btree ("trigger_id","name");--> statement-breakpoint
CREATE INDEX "workflow_triggers_company_id_idx" ON "workflow_triggers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "workflow_triggers_definition_id_idx" ON "workflow_triggers" USING btree ("workflow_definition_id");--> statement-breakpoint
CREATE INDEX "workflow_triggers_company_enabled_idx" ON "workflow_triggers" USING btree ("company_id","enabled");--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_trigger_id_workflow_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."workflow_triggers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_runs_trigger_id_idx" ON "workflow_runs" USING btree ("trigger_id");--> statement-breakpoint
ALTER TABLE "workflow_triggers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "workflow_triggers_company_scope_policy"
ON "workflow_triggers"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "workflow_cron_triggers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "workflow_cron_triggers_company_scope_policy"
ON "workflow_cron_triggers"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "workflow_trigger_input_values" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "workflow_trigger_input_values_company_scope_policy"
ON "workflow_trigger_input_values"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
