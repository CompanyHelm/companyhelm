ALTER TABLE "agent_session_active_skills" DROP CONSTRAINT "agent_session_active_skills_session_id_skill_id_pk";--> statement-breakpoint
ALTER TABLE "agent_skills" DROP CONSTRAINT "agent_skills_agent_id_skill_id_pk";--> statement-breakpoint
ALTER TABLE "agent_session_active_skills" ALTER COLUMN "skill_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_skills" ALTER COLUMN "skill_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_session_active_skills" ADD COLUMN "system_skill_key" text;--> statement-breakpoint
ALTER TABLE "agent_skills" ADD COLUMN "system_skill_key" text;--> statement-breakpoint
CREATE INDEX "agent_session_active_skills_system_skill_key_idx" ON "agent_session_active_skills" USING btree ("system_skill_key");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_session_active_skills_session_skill_uidx" ON "agent_session_active_skills" USING btree ("session_id","skill_id") WHERE "agent_session_active_skills"."skill_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_session_active_skills_session_system_skill_uidx" ON "agent_session_active_skills" USING btree ("session_id","system_skill_key") WHERE "agent_session_active_skills"."system_skill_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "agent_skills_system_skill_key_idx" ON "agent_skills" USING btree ("system_skill_key");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_skills_agent_skill_uidx" ON "agent_skills" USING btree ("agent_id","skill_id") WHERE "agent_skills"."skill_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_skills_agent_system_skill_uidx" ON "agent_skills" USING btree ("agent_id","system_skill_key") WHERE "agent_skills"."system_skill_key" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_session_active_skills" ADD CONSTRAINT "agent_session_active_skills_one_skill_reference_check" CHECK (num_nonnulls("agent_session_active_skills"."skill_id", "agent_session_active_skills"."system_skill_key") = 1);--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_one_skill_reference_check" CHECK (num_nonnulls("agent_skills"."skill_id", "agent_skills"."system_skill_key") = 1);