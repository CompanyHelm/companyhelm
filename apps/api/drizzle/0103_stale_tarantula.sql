ALTER TABLE "workflow_definition_inputs" DROP CONSTRAINT "workflow_definition_inputs_default_value_type_check";--> statement-breakpoint
ALTER TABLE "workflow_definition_inputs" DROP CONSTRAINT "workflow_definition_inputs_ordinal_check";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP CONSTRAINT "workflow_step_runs_attempt_no_check";--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP CONSTRAINT "workflow_runs_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP CONSTRAINT "workflow_runs_session_id_agent_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP CONSTRAINT "workflow_step_runs_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP CONSTRAINT "workflow_step_runs_session_id_agent_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP CONSTRAINT "workflow_step_runs_child_workflow_run_id_workflow_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_runs" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workflow_runs" ALTER COLUMN "status" SET DEFAULT 'running'::text;--> statement-breakpoint
DROP TYPE "public"."workflow_run_status";--> statement-breakpoint
CREATE TYPE "public"."workflow_run_status" AS ENUM('running', 'completed', 'canceled');--> statement-breakpoint
ALTER TABLE "workflow_runs" ALTER COLUMN "status" SET DEFAULT 'running'::"public"."workflow_run_status";--> statement-breakpoint
ALTER TABLE "workflow_runs" ALTER COLUMN "status" SET DATA TYPE "public"."workflow_run_status" USING "status"::"public"."workflow_run_status";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."workflow_step_status";--> statement-breakpoint
CREATE TYPE "public"."workflow_step_status" AS ENUM('pending', 'running', 'completed');--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."workflow_step_status";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ALTER COLUMN "status" SET DATA TYPE "public"."workflow_step_status" USING "status"::"public"."workflow_step_status";--> statement-breakpoint
DROP INDEX "workflow_definition_inputs_definition_ordinal_uidx";--> statement-breakpoint
DROP INDEX "workflow_definitions_company_status_idx";--> statement-breakpoint
DROP INDEX "workflow_step_runs_session_id_idx";--> statement-breakpoint
DROP INDEX "workflow_step_runs_child_workflow_run_id_idx";--> statement-breakpoint
DROP INDEX "workflow_step_runs_workflow_step_attempt_uidx";--> statement-breakpoint
DROP INDEX "workflow_definition_inputs_definition_input_uidx";--> statement-breakpoint
ALTER TABLE "workflow_definition_inputs" ADD COLUMN "default_value" text;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "workflow_step_definitions" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_definition_inputs_definition_input_uidx" ON "workflow_definition_inputs" USING btree ("workflow_definition_id","name");--> statement-breakpoint
ALTER TABLE "workflow_definition_inputs" DROP COLUMN "input_key";--> statement-breakpoint
ALTER TABLE "workflow_definition_inputs" DROP COLUMN "value_type";--> statement-breakpoint
ALTER TABLE "workflow_definition_inputs" DROP COLUMN "default_text_value";--> statement-breakpoint
ALTER TABLE "workflow_definition_inputs" DROP COLUMN "default_integer_value";--> statement-breakpoint
ALTER TABLE "workflow_definition_inputs" DROP COLUMN "default_boolean_value";--> statement-breakpoint
ALTER TABLE "workflow_definition_inputs" DROP COLUMN "ordinal";--> statement-breakpoint
ALTER TABLE "workflow_definitions" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "workflow_definitions" DROP COLUMN "initial_step_id";--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN "started_by_actor_type";--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN "waiting_reason";--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN "error_code";--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN "error_message";--> statement-breakpoint
ALTER TABLE "workflow_step_definitions" DROP COLUMN "step_type";--> statement-breakpoint
ALTER TABLE "workflow_step_definitions" DROP COLUMN "next_step_id";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "step_type";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "agent_id";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "session_id";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "attempt_no";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "child_workflow_run_id";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "waiting_reason";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "error_code";--> statement-breakpoint
ALTER TABLE "workflow_step_runs" DROP COLUMN "error_message";--> statement-breakpoint
DROP TYPE "public"."workflow_actor_type";--> statement-breakpoint
DROP TYPE "public"."workflow_definition_input_type";--> statement-breakpoint
DROP TYPE "public"."workflow_definition_status";