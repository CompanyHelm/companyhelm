CREATE TYPE "public"."artifact_pull_request_provider" AS ENUM('github');--> statement-breakpoint
CREATE TYPE "public"."artifact_scope" AS ENUM('company', 'task');--> statement-breakpoint
CREATE TYPE "public"."artifact_state" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."artifact_type" AS ENUM('markdown_document', 'external_link', 'pull_request');--> statement-breakpoint
CREATE TABLE "artifact_external_links" (
	"artifact_id" uuid PRIMARY KEY NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact_markdown_documents" (
	"artifact_id" uuid PRIMARY KEY NOT NULL,
	"content_markdown" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact_pull_requests" (
	"artifact_id" uuid PRIMARY KEY NOT NULL,
	"provider" "artifact_pull_request_provider" DEFAULT 'github' NOT NULL,
	"repository" text,
	"pull_request_number" integer,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"task_id" uuid,
	"scope_type" "artifact_scope" NOT NULL,
	"type" "artifact_type" NOT NULL,
	"state" "artifact_state" DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by_user_id" uuid,
	"created_by_agent_id" uuid,
	"updated_by_user_id" uuid,
	"updated_by_agent_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "artifacts_scope_task_id_check" CHECK (("artifacts"."scope_type" = 'company' AND "artifacts"."task_id" IS NULL) OR ("artifacts"."scope_type" = 'task' AND "artifacts"."task_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "artifact_external_links" ADD CONSTRAINT "artifact_external_links_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_markdown_documents" ADD CONSTRAINT "artifact_markdown_documents_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_pull_requests" ADD CONSTRAINT "artifact_pull_requests_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_updated_by_agent_id_agents_id_fk" FOREIGN KEY ("updated_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifact_external_links_artifact_id_idx" ON "artifact_external_links" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "artifact_markdown_documents_artifact_id_idx" ON "artifact_markdown_documents" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "artifact_pull_requests_artifact_id_idx" ON "artifact_pull_requests" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "artifacts_company_id_idx" ON "artifacts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "artifacts_company_scope_updated_at_idx" ON "artifacts" USING btree ("company_id","scope_type","updated_at");--> statement-breakpoint
CREATE INDEX "artifacts_task_id_idx" ON "artifacts" USING btree ("task_id");