CREATE TYPE "public"."workflow_actor_type" AS ENUM('user', 'agent', 'system', 'workflow');--> statement-breakpoint
CREATE TYPE "public"."workflow_definition_input_type" AS ENUM('text', 'integer', 'boolean');--> statement-breakpoint
CREATE TYPE "public"."workflow_definition_status" AS ENUM('draft', 'active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."workflow_run_status" AS ENUM('queued', 'running', 'waiting', 'completed', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."workflow_step_status" AS ENUM('pending', 'running', 'waiting', 'completed', 'failed', 'skipped', 'canceled');--> statement-breakpoint
CREATE TABLE "workflow_definition_inputs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"workflow_definition_id" uuid NOT NULL,
	"input_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"value_type" "workflow_definition_input_type" NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"default_text_value" text,
	"default_integer_value" integer,
	"default_boolean_value" boolean,
	"ordinal" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workflow_definition_inputs_default_value_type_check" CHECK ((
      "workflow_definition_inputs"."default_text_value" IS NULL
      AND "workflow_definition_inputs"."default_integer_value" IS NULL
      AND "workflow_definition_inputs"."default_boolean_value" IS NULL
    ) OR (
      "workflow_definition_inputs"."value_type" = 'text'
      AND "workflow_definition_inputs"."default_text_value" IS NOT NULL
      AND "workflow_definition_inputs"."default_integer_value" IS NULL
      AND "workflow_definition_inputs"."default_boolean_value" IS NULL
    ) OR (
      "workflow_definition_inputs"."value_type" = 'integer'
      AND "workflow_definition_inputs"."default_text_value" IS NULL
      AND "workflow_definition_inputs"."default_integer_value" IS NOT NULL
      AND "workflow_definition_inputs"."default_boolean_value" IS NULL
    ) OR (
      "workflow_definition_inputs"."value_type" = 'boolean'
      AND "workflow_definition_inputs"."default_text_value" IS NULL
      AND "workflow_definition_inputs"."default_integer_value" IS NULL
      AND "workflow_definition_inputs"."default_boolean_value" IS NOT NULL
    )),
	CONSTRAINT "workflow_definition_inputs_ordinal_check" CHECK ("workflow_definition_inputs"."ordinal" > 0)
);
--> statement-breakpoint
CREATE TABLE "workflow_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "workflow_definition_status" DEFAULT 'draft' NOT NULL,
	"initial_step_id" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_by_agent_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workflow_definitions_one_creator_check" CHECK (num_nonnulls("workflow_definitions"."created_by_user_id", "workflow_definitions"."created_by_agent_id") <= 1)
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"workflow_definition_id" uuid NOT NULL,
	"status" "workflow_run_status" DEFAULT 'queued' NOT NULL,
	"agent_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"current_step_id" text,
	"started_by_actor_type" "workflow_actor_type" NOT NULL,
	"started_by_user_id" uuid,
	"started_by_agent_id" uuid,
	"started_by_session_id" uuid,
	"parent_workflow_run_id" uuid,
	"parent_step_run_id" uuid,
	"waiting_reason" text,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workflow_runs_one_starter_check" CHECK (num_nonnulls("workflow_runs"."started_by_user_id", "workflow_runs"."started_by_agent_id") <= 1)
);
--> statement-breakpoint
CREATE TABLE "workflow_step_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workflow_definition_id" uuid NOT NULL,
	"step_id" text NOT NULL,
	"name" text NOT NULL,
	"step_type" text NOT NULL,
	"ordinal" integer NOT NULL,
	"next_step_id" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workflow_step_definitions_ordinal_check" CHECK ("workflow_step_definitions"."ordinal" > 0)
);
--> statement-breakpoint
CREATE TABLE "workflow_step_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"workflow_run_id" uuid NOT NULL,
	"workflow_step_definition_id" uuid,
	"step_id" text NOT NULL,
	"name" text NOT NULL,
	"step_type" text NOT NULL,
	"ordinal" integer NOT NULL,
	"status" "workflow_step_status" DEFAULT 'pending' NOT NULL,
	"agent_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"child_workflow_run_id" uuid,
	"waiting_reason" text,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workflow_step_runs_attempt_no_check" CHECK ("workflow_step_runs"."attempt_no" > 0),
	CONSTRAINT "workflow_step_runs_ordinal_check" CHECK ("workflow_step_runs"."ordinal" > 0)
);
--> statement-breakpoint
ALTER TABLE "workflow_definition_inputs" ADD CONSTRAINT "workflow_definition_inputs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definition_inputs" ADD CONSTRAINT "workflow_definition_inputs_workflow_definition_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_definition_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_started_by_user_id_users_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_started_by_agent_id_agents_id_fk" FOREIGN KEY ("started_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_started_by_session_id_agent_sessions_id_fk" FOREIGN KEY ("started_by_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_parent_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("parent_workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_parent_step_run_id_workflow_step_runs_id_fk" FOREIGN KEY ("parent_step_run_id") REFERENCES "public"."workflow_step_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_definitions" ADD CONSTRAINT "workflow_step_definitions_workflow_definition_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_workflow_step_definition_id_workflow_step_definitions_id_fk" FOREIGN KEY ("workflow_step_definition_id") REFERENCES "public"."workflow_step_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_child_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("child_workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_definition_inputs_company_id_idx" ON "workflow_definition_inputs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "workflow_definition_inputs_definition_id_idx" ON "workflow_definition_inputs" USING btree ("workflow_definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_definition_inputs_definition_input_uidx" ON "workflow_definition_inputs" USING btree ("workflow_definition_id","input_key");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_definition_inputs_definition_ordinal_uidx" ON "workflow_definition_inputs" USING btree ("workflow_definition_id","ordinal");--> statement-breakpoint
CREATE INDEX "workflow_definitions_company_id_idx" ON "workflow_definitions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "workflow_definitions_company_is_enabled_idx" ON "workflow_definitions" USING btree ("company_id","is_enabled");--> statement-breakpoint
CREATE INDEX "workflow_definitions_company_status_idx" ON "workflow_definitions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "workflow_runs_company_status_idx" ON "workflow_runs" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "workflow_runs_company_agent_status_idx" ON "workflow_runs" USING btree ("company_id","agent_id","status");--> statement-breakpoint
CREATE INDEX "workflow_runs_definition_id_idx" ON "workflow_runs" USING btree ("workflow_definition_id");--> statement-breakpoint
CREATE INDEX "workflow_runs_parent_workflow_run_id_idx" ON "workflow_runs" USING btree ("parent_workflow_run_id");--> statement-breakpoint
CREATE INDEX "workflow_runs_parent_step_run_id_idx" ON "workflow_runs" USING btree ("parent_step_run_id");--> statement-breakpoint
CREATE INDEX "workflow_runs_started_by_session_id_idx" ON "workflow_runs" USING btree ("started_by_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_runs_session_id_uidx" ON "workflow_runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "workflow_step_definitions_definition_id_idx" ON "workflow_step_definitions" USING btree ("workflow_definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_step_definitions_definition_step_uidx" ON "workflow_step_definitions" USING btree ("workflow_definition_id","step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_step_definitions_definition_ordinal_uidx" ON "workflow_step_definitions" USING btree ("workflow_definition_id","ordinal");--> statement-breakpoint
CREATE INDEX "workflow_step_runs_company_id_idx" ON "workflow_step_runs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "workflow_step_runs_workflow_run_status_idx" ON "workflow_step_runs" USING btree ("workflow_run_id","status");--> statement-breakpoint
CREATE INDEX "workflow_step_runs_session_id_idx" ON "workflow_step_runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "workflow_step_runs_child_workflow_run_id_idx" ON "workflow_step_runs" USING btree ("child_workflow_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_step_runs_workflow_step_attempt_uidx" ON "workflow_step_runs" USING btree ("workflow_run_id","step_id","attempt_no");