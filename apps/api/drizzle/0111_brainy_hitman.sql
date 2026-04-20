ALTER TABLE "agent_skill_groups" DROP CONSTRAINT "agent_skill_groups_agent_id_skill_group_id_pk";--> statement-breakpoint
ALTER TABLE "agent_skill_groups" ALTER COLUMN "skill_group_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_skill_groups" ADD COLUMN "system_skill_group_key" text;--> statement-breakpoint
CREATE INDEX "agent_skill_groups_system_skill_group_key_idx" ON "agent_skill_groups" USING btree ("system_skill_group_key");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_skill_groups_agent_skill_group_uidx" ON "agent_skill_groups" USING btree ("agent_id","skill_group_id") WHERE "agent_skill_groups"."skill_group_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_skill_groups_agent_system_skill_group_uidx" ON "agent_skill_groups" USING btree ("agent_id","system_skill_group_key") WHERE "agent_skill_groups"."system_skill_group_key" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_skill_groups" ADD CONSTRAINT "agent_skill_groups_one_skill_group_reference_check" CHECK (num_nonnulls("agent_skill_groups"."skill_group_id", "agent_skill_groups"."system_skill_group_key") = 1);