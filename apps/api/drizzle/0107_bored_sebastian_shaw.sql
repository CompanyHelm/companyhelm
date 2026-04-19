ALTER TABLE "workflow_step_runs" RENAME TO "workflow_run_steps";--> statement-breakpoint
ALTER TABLE "workflow_run_steps" DROP CONSTRAINT "workflow_step_runs_ordinal_check";--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP CONSTRAINT "workflow_runs_running_step_run_id_workflow_step_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP CONSTRAINT "workflow_runs_workflow_definition_id_workflow_definitions_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_run_steps" DROP CONSTRAINT "workflow_step_runs_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_run_steps" DROP CONSTRAINT "workflow_step_runs_workflow_run_id_workflow_runs_id_fk";
--> statement-breakpoint
DROP INDEX "workflow_step_runs_company_id_idx";--> statement-breakpoint
DROP INDEX "workflow_step_runs_workflow_run_id_idx";--> statement-breakpoint
ALTER TABLE "workflow_runs" ALTER COLUMN "workflow_definition_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_running_step_run_id_workflow_run_steps_id_fk" FOREIGN KEY ("running_step_run_id") REFERENCES "public"."workflow_run_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_definition_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_run_steps" ADD CONSTRAINT "workflow_run_steps_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_run_steps" ADD CONSTRAINT "workflow_run_steps_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_run_steps_company_id_idx" ON "workflow_run_steps" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "workflow_run_steps_workflow_run_id_idx" ON "workflow_run_steps" USING btree ("workflow_run_id");--> statement-breakpoint
ALTER TABLE "workflow_run_steps" ADD CONSTRAINT "workflow_run_steps_ordinal_check" CHECK ("workflow_run_steps"."ordinal" > 0);