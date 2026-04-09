CREATE TABLE "session_context_checkpoints" (
	"turn_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"context_messages" jsonb NOT NULL,
	"current_context_tokens" integer,
	"max_context_tokens" integer,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_queued_message_contents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"session_queued_message_id" uuid NOT NULL,
	"type" "message_content_type" NOT NULL,
	"text" text,
	"data" text,
	"mime_type" text,
	"structured_content" jsonb,
	"tool_call_id" text,
	"tool_name" text,
	"arguments" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"instructions" text,
	"file_list" text[] NOT NULL,
	"skill_group_id" uuid,
	"repository" text,
	"skill_directory" text
);
--> statement-breakpoint
ALTER TABLE "agent_environment_requirements" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "legacy_compute_provider_definitions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session_queued_message_images" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "agent_environment_requirements" CASCADE;--> statement-breakpoint
DROP TABLE "legacy_compute_provider_definitions" CASCADE;--> statement-breakpoint
DROP TABLE "session_queued_message_images" CASCADE;--> statement-breakpoint
ALTER TABLE "agent_environments" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "compute_provider_definitions" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."compute_provider";--> statement-breakpoint
CREATE TYPE "public"."compute_provider" AS ENUM('e2b');--> statement-breakpoint
ALTER TABLE "agent_environments" ALTER COLUMN "provider" SET DATA TYPE "public"."compute_provider" USING "provider"::"public"."compute_provider";--> statement-breakpoint
ALTER TABLE "compute_provider_definitions" ALTER COLUMN "provider" SET DATA TYPE "public"."compute_provider" USING "provider"::"public"."compute_provider";--> statement-breakpoint
ALTER TABLE "agent_environments" ADD COLUMN "template_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "forked_from_turn_id" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "default_environment_template_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD COLUMN "dispatched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session_context_checkpoints" ADD CONSTRAINT "session_context_checkpoints_turn_id_session_turns_id_fk" FOREIGN KEY ("turn_id") REFERENCES "public"."session_turns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_context_checkpoints" ADD CONSTRAINT "session_context_checkpoints_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_context_checkpoints" ADD CONSTRAINT "session_context_checkpoints_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queued_message_contents" ADD CONSTRAINT "session_queued_message_contents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queued_message_contents" ADD CONSTRAINT "session_queued_message_contents_session_queued_message_id_session_queued_messages_id_fk" FOREIGN KEY ("session_queued_message_id") REFERENCES "public"."session_queued_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_groups" ADD CONSTRAINT "skill_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_skill_group_id_skill_groups_id_fk" FOREIGN KEY ("skill_group_id") REFERENCES "public"."skill_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_context_checkpoints_company_id_idx" ON "session_context_checkpoints" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "session_context_checkpoints_session_id_idx" ON "session_context_checkpoints" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_context_checkpoints_session_created_at_idx" ON "session_context_checkpoints" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "session_queued_message_contents_company_id_idx" ON "session_queued_message_contents" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "session_queued_message_contents_session_queued_message_id_idx" ON "session_queued_message_contents" USING btree ("session_queued_message_id");--> statement-breakpoint
CREATE INDEX "skill_groups_company_id_idx" ON "skill_groups" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "skills_skill_group_id_idx" ON "skills" USING btree ("skill_group_id");--> statement-breakpoint
CREATE INDEX "skills_company_id_idx" ON "skills" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_forked_from_turn_id_session_turns_id_fk" FOREIGN KEY ("forked_from_turn_id") REFERENCES "public"."session_turns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queued_messages" DROP COLUMN "text";