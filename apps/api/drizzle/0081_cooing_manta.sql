ALTER TYPE "public"."model_provider" ADD VALUE 'openrouter';--> statement-breakpoint
CREATE TABLE "agent_skill_groups" (
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"skill_group_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_skill_groups_agent_id_skill_group_id_pk" PRIMARY KEY("agent_id","skill_group_id")
);
--> statement-breakpoint
CREATE TABLE "agent_skills" (
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_skills_agent_id_skill_id_pk" PRIMARY KEY("agent_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "context_messages_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "context_messages_snapshot_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" ADD COLUMN "reasoning_supported" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "session_context_checkpoints" ADD COLUMN "context_messages_snapshot" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_skill_groups" ADD CONSTRAINT "agent_skill_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skill_groups" ADD CONSTRAINT "agent_skill_groups_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skill_groups" ADD CONSTRAINT "agent_skill_groups_skill_group_id_skill_groups_id_fk" FOREIGN KEY ("skill_group_id") REFERENCES "public"."skill_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skill_groups" ADD CONSTRAINT "agent_skill_groups_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_skill_groups_company_id_idx" ON "agent_skill_groups" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_skill_groups_agent_id_idx" ON "agent_skill_groups" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_skill_groups_skill_group_id_idx" ON "agent_skill_groups" USING btree ("skill_group_id");--> statement-breakpoint
CREATE INDEX "agent_skills_company_id_idx" ON "agent_skills" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_skills_agent_id_idx" ON "agent_skills" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_skills_skill_id_idx" ON "agent_skills" USING btree ("skill_id");--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP COLUMN "context_messages";--> statement-breakpoint
ALTER TABLE "session_context_checkpoints" DROP COLUMN "context_messages";