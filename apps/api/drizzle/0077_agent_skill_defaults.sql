CREATE TABLE IF NOT EXISTS "agent_skills" (
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "agent_id" uuid NOT NULL REFERENCES "agents"("id") ON DELETE cascade,
  "skill_id" uuid NOT NULL REFERENCES "skills"("id") ON DELETE cascade,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "agent_skills_agent_id_skill_id_pk" PRIMARY KEY("agent_id", "skill_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "agent_skills_company_id_idx" ON "agent_skills" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_skills_agent_id_idx" ON "agent_skills" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_skills_skill_id_idx" ON "agent_skills" USING btree ("skill_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "agent_skill_groups" (
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "agent_id" uuid NOT NULL REFERENCES "agents"("id") ON DELETE cascade,
  "skill_group_id" uuid NOT NULL REFERENCES "skill_groups"("id") ON DELETE cascade,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "agent_skill_groups_agent_id_skill_group_id_pk" PRIMARY KEY("agent_id", "skill_group_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "agent_skill_groups_company_id_idx" ON "agent_skill_groups" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_skill_groups_agent_id_idx" ON "agent_skill_groups" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_skill_groups_skill_group_id_idx" ON "agent_skill_groups" USING btree ("skill_group_id");
