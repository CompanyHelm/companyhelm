DROP INDEX "workflow_step_runs_workflow_run_status_idx";--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "running_step_id" text;--> statement-breakpoint
CREATE INDEX "workflow_step_runs_workflow_run_id_idx" ON "workflow_step_runs" USING btree ("workflow_run_id");--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN "current_step_id";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."workflow_step_status";