ALTER TABLE "workflow_runs" DROP CONSTRAINT "workflow_runs_parent_step_run_id_workflow_step_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP CONSTRAINT "workflow_step_runs_workflow_step_definition_id_workflow_step_definitions_id_fk";
--> statement-breakpoint
DROP INDEX "workflow_runs_parent_step_run_id_idx";--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "running_step_run_id" uuid;--> statement-breakpoint
ALTER TABLE "workflow_step_definitions" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_running_step_run_id_workflow_step_runs_id_fk" FOREIGN KEY ("running_step_run_id") REFERENCES "public"."workflow_step_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_runs_running_step_run_id_idx" ON "workflow_runs" USING btree ("running_step_run_id");--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN "running_step_id";--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN "parent_step_run_id";--> statement-breakpoint
ALTER TABLE "workflow_step_definitions" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "workflow_step_definition_id";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "step_id";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "started_at";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "completed_at";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "updated_at";