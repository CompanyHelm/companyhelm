ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "default_environment_template_id" text;--> statement-breakpoint

WITH company_default_provider_definitions AS (
  SELECT DISTINCT ON ("company_id")
    "company_id",
    "id",
    "provider"
  FROM "compute_provider_definitions"
  WHERE "is_default" = true
  ORDER BY "company_id", "updated_at" DESC, "created_at" DESC, "id" DESC
)
UPDATE "agents"
SET "default_compute_provider_definition_id" = company_default_provider_definitions."id"
FROM company_default_provider_definitions
WHERE "agents"."company_id" = company_default_provider_definitions."company_id"
  AND "agents"."default_compute_provider_definition_id" IS NULL;--> statement-breakpoint

WITH company_default_provider_definitions AS (
  SELECT DISTINCT ON ("company_id")
    "company_id",
    "provider"
  FROM "compute_provider_definitions"
  WHERE "is_default" = true
  ORDER BY "company_id", "updated_at" DESC, "created_at" DESC, "id" DESC
),
resolved_provider_definitions AS (
  SELECT
    "agents"."id" AS "agent_id",
    COALESCE(
      selected_provider_definitions."provider"::text,
      company_default_provider_definitions."provider"::text,
      'daytona'
    ) AS "provider"
  FROM "agents"
  LEFT JOIN "compute_provider_definitions" AS selected_provider_definitions
    ON selected_provider_definitions."id" = "agents"."default_compute_provider_definition_id"
  LEFT JOIN company_default_provider_definitions
    ON company_default_provider_definitions."company_id" = "agents"."company_id"
)
UPDATE "agents"
SET "default_environment_template_id" = CASE resolved_provider_definitions."provider"
  WHEN 'e2b' THEN 'e2b/desktop'
  ELSE 'daytona/default'
END
FROM resolved_provider_definitions
WHERE "agents"."id" = resolved_provider_definitions."agent_id"
  AND "agents"."default_environment_template_id" IS NULL;--> statement-breakpoint

ALTER TABLE "agents"
  ALTER COLUMN "default_environment_template_id" SET NOT NULL;--> statement-breakpoint

DROP TABLE IF EXISTS "agent_environment_requirements";
