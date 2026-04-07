ALTER TABLE "agent_environments"
  ADD COLUMN IF NOT EXISTS "template_id" text;--> statement-breakpoint

UPDATE "agent_environments"
SET "template_id" = "agents"."default_environment_template_id"
FROM "agents"
WHERE "agents"."id" = "agent_environments"."agent_id"
  AND "agent_environments"."template_id" IS NULL;--> statement-breakpoint

ALTER TABLE "agent_environments"
  ALTER COLUMN "template_id" SET NOT NULL;
