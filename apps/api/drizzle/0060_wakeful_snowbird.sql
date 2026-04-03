CREATE TYPE "public"."task_run_status" AS ENUM('queued', 'running', 'completed', 'failed', 'canceled');--> statement-breakpoint
CREATE TABLE "task_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"session_id" uuid,
	"status" "task_run_status" DEFAULT 'queued' NOT NULL,
	"created_by_user_id" uuid,
	"created_by_agent_id" uuid,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone NOT NULL,
	"ended_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "task_runs_one_creator_check" CHECK (num_nonnulls("task_runs"."created_by_user_id", "task_runs"."created_by_agent_id") <= 1)
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
UPDATE "tasks" SET "status" = 'draft' WHERE "status" = 'pending';--> statement-breakpoint
DROP TYPE "public"."task_status";--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('draft', 'in_progress', 'completed');--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."task_status";--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DATA TYPE "public"."task_status" USING "status"::"public"."task_status";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "root_task_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "parent_task_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "created_by_agent_id" uuid;--> statement-breakpoint
UPDATE "tasks" SET "root_task_id" = "id" WHERE "root_task_id" IS NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "root_task_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_runs_company_id_idx" ON "task_runs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "task_runs_task_created_at_idx" ON "task_runs" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_runs_agent_created_at_idx" ON "task_runs" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_runs_session_id_uidx" ON "task_runs" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_runs_open_task_id_uidx" ON "task_runs" USING btree ("task_id") WHERE "task_runs"."finished_at" IS NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_root_task_id_tasks_id_fk" FOREIGN KEY ("root_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_root_task_id_idx" ON "tasks" USING btree ("root_task_id");--> statement-breakpoint
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks" USING btree ("parent_task_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_one_creator_check" CHECK (num_nonnulls("tasks"."created_by_user_id", "tasks"."created_by_agent_id") <= 1);
