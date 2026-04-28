CREATE TYPE "public"."model_credential_source" AS ENUM('platform', 'user_provided');
--> statement-breakpoint
ALTER TABLE "platform_model_provider_credential_models" ADD COLUMN "is_available" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "platform_model_provider_credential_models" ADD COLUMN "unavailable_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "default_model_credential_source" "model_credential_source" DEFAULT 'user_provided' NOT NULL;
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "default_platform_model_provider_credential_model_id" uuid;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "current_model_credential_source" "model_credential_source" DEFAULT 'user_provided' NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "current_platform_model_provider_credential_model_id" uuid;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "current_model_provider_credential_model_id" DROP NOT NULL;
--> statement-breakpoint
WITH "managed_source" AS (
  SELECT
    "model_provider_credentials"."model_provider_credential_type",
    "model_provider_credentials"."encrypted_api_key",
    "model_provider_credentials"."base_url",
    "model_provider_credentials"."refresh_token",
    "model_provider_credentials"."access_token_expires_at",
    "model_provider_credentials"."refreshed_at"
  FROM "model_provider_credentials"
  WHERE "model_provider_credentials"."is_managed" = true
  ORDER BY "model_provider_credentials"."created_at" ASC
  LIMIT 1
)
INSERT INTO "platform_model_provider_credentials" (
  "id",
  "name",
  "model_provider",
  "model_provider_credential_type",
  "encrypted_api_key",
  "base_url",
  "refresh_token",
  "access_token_expires_at",
  "refreshed_at",
  "is_default",
  "status",
  "error_message",
  "created_by_user_id",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  'CompanyHelm',
  'companyhelm',
  "managed_source"."model_provider_credential_type",
  "managed_source"."encrypted_api_key",
  "managed_source"."base_url",
  "managed_source"."refresh_token",
  "managed_source"."access_token_expires_at",
  "managed_source"."refreshed_at",
  true,
  'active',
  NULL,
  NULL,
  NOW(),
  NOW()
FROM "managed_source"
WHERE NOT EXISTS (
  SELECT 1
  FROM "platform_model_provider_credentials"
  WHERE "platform_model_provider_credentials"."model_provider" = 'companyhelm'
);
--> statement-breakpoint
WITH "platform_companyhelm_credential" AS (
  SELECT "id"
  FROM "platform_model_provider_credentials"
  WHERE "model_provider" = 'companyhelm'
  ORDER BY "is_default" DESC, "created_at" ASC
  LIMIT 1
),
"managed_models" AS (
  SELECT DISTINCT
    "model_provider_credential_models"."model_id",
    "model_provider_credential_models"."name",
    "model_provider_credential_models"."description",
    "model_provider_credential_models"."reasoning_supported",
    "model_provider_credential_models"."reasoning_levels",
    "model_provider_credential_models"."is_default"
  FROM "model_provider_credential_models"
  INNER JOIN "model_provider_credentials"
    ON "model_provider_credentials"."id" = "model_provider_credential_models"."model_provider_credential_id"
  WHERE "model_provider_credentials"."is_managed" = true
)
INSERT INTO "platform_model_provider_credential_models" (
  "id",
  "platform_model_provider_credential_id",
  "model_id",
  "name",
  "description",
  "reasoning_supported",
  "reasoning_levels",
  "is_default",
  "is_available",
  "unavailable_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  "platform_companyhelm_credential"."id",
  "managed_models"."model_id",
  "managed_models"."name",
  "managed_models"."description",
  "managed_models"."reasoning_supported",
  "managed_models"."reasoning_levels",
  "managed_models"."is_default",
  true,
  NULL,
  NOW(),
  NOW()
FROM "platform_companyhelm_credential"
CROSS JOIN "managed_models"
ON CONFLICT ("platform_model_provider_credential_id", "model_id") DO NOTHING;
--> statement-breakpoint
UPDATE "agents"
SET
  "default_model_credential_source" = 'platform',
  "default_platform_model_provider_credential_model_id" = "platform_model"."id",
  "default_model_provider_credential_model_id" = NULL
FROM "model_provider_credential_models" AS "company_model"
INNER JOIN "model_provider_credentials" AS "company_credential"
  ON "company_credential"."id" = "company_model"."model_provider_credential_id"
INNER JOIN "platform_model_provider_credential_models" AS "platform_model"
  ON "platform_model"."model_id" = "company_model"."model_id"
INNER JOIN "platform_model_provider_credentials" AS "platform_credential"
  ON "platform_credential"."id" = "platform_model"."platform_model_provider_credential_id"
WHERE "company_credential"."is_managed" = true
  AND "platform_credential"."model_provider" = 'companyhelm'
  AND "agents"."default_model_provider_credential_model_id" = "company_model"."id";
--> statement-breakpoint
UPDATE "agent_sessions"
SET
  "current_model_credential_source" = 'platform',
  "current_platform_model_provider_credential_model_id" = "platform_model"."id",
  "current_model_provider_credential_model_id" = NULL
FROM "model_provider_credential_models" AS "company_model"
INNER JOIN "model_provider_credentials" AS "company_credential"
  ON "company_credential"."id" = "company_model"."model_provider_credential_id"
INNER JOIN "platform_model_provider_credential_models" AS "platform_model"
  ON "platform_model"."model_id" = "company_model"."model_id"
INNER JOIN "platform_model_provider_credentials" AS "platform_credential"
  ON "platform_credential"."id" = "platform_model"."platform_model_provider_credential_id"
WHERE "company_credential"."is_managed" = true
  AND "platform_credential"."model_provider" = 'companyhelm'
  AND "agent_sessions"."current_model_provider_credential_model_id" = "company_model"."id";
--> statement-breakpoint
DELETE FROM "model_provider_credential_models"
USING "model_provider_credentials"
WHERE "model_provider_credentials"."id" = "model_provider_credential_models"."model_provider_credential_id"
  AND "model_provider_credentials"."is_managed" = true;
--> statement-breakpoint
DELETE FROM "model_provider_credentials"
WHERE "is_managed" = true;
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_default_platform_model_provider_credential_model_id_fk" FOREIGN KEY ("default_platform_model_provider_credential_model_id") REFERENCES "public"."platform_model_provider_credential_models"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_current_platform_model_provider_credential_model_id_fk" FOREIGN KEY ("current_platform_model_provider_credential_model_id") REFERENCES "public"."platform_model_provider_credential_models"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_default_model_selection_check" CHECK (
  (
    "default_model_credential_source" = 'platform'
    AND "default_platform_model_provider_credential_model_id" IS NOT NULL
    AND "default_model_provider_credential_model_id" IS NULL
  )
  OR
  (
    "default_model_credential_source" = 'user_provided'
    AND "default_platform_model_provider_credential_model_id" IS NULL
    AND "default_model_provider_credential_model_id" IS NOT NULL
  )
);
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_current_model_selection_check" CHECK (
  (
    "current_model_credential_source" = 'platform'
    AND "current_platform_model_provider_credential_model_id" IS NOT NULL
    AND "current_model_provider_credential_model_id" IS NULL
  )
  OR
  (
    "current_model_credential_source" = 'user_provided'
    AND "current_platform_model_provider_credential_model_id" IS NULL
    AND "current_model_provider_credential_model_id" IS NOT NULL
  )
);
--> statement-breakpoint
DROP INDEX IF EXISTS "model_provider_credentials_company_managed_uidx";
--> statement-breakpoint
ALTER TABLE "model_provider_credentials" DROP COLUMN "is_managed";
