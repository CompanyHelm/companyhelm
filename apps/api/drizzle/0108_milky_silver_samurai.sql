CREATE TYPE "public"."workflow_run_step_status" AS ENUM('pending', 'running', 'done');--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP CONSTRAINT "workflow_runs_running_step_run_id_workflow_run_steps_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_runs" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workflow_runs" ALTER COLUMN "status" SET DEFAULT 'running'::text;--> statement-breakpoint
DROP TYPE "public"."workflow_run_status";--> statement-breakpoint
CREATE TYPE "public"."workflow_run_status" AS ENUM('running', 'done', 'canceled');--> statement-breakpoint
ALTER TABLE "workflow_runs" ALTER COLUMN "status" SET DEFAULT 'running'::"public"."workflow_run_status";--> statement-breakpoint
ALTER TABLE "workflow_runs" ALTER COLUMN "status" SET DATA TYPE "public"."workflow_run_status" USING CASE WHEN "status" = 'completed' THEN 'done' ELSE "status" END::"public"."workflow_run_status";--> statement-breakpoint
DROP INDEX "workflow_runs_running_step_run_id_idx";--> statement-breakpoint
ALTER TABLE "workflow_run_steps" ADD COLUMN "status" "workflow_run_step_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN "running_step_run_id";
