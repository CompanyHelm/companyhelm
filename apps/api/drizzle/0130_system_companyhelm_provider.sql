ALTER TYPE "public"."model_provider" ADD VALUE IF NOT EXISTS 'companyhelm';
--> statement-breakpoint
COMMIT;
--> statement-breakpoint
BEGIN;
--> statement-breakpoint
UPDATE "model_provider_credentials"
SET
  "name" = 'CompanyHelm',
  "model_provider" = 'companyhelm',
  "model_provider_credential_type" = 'api_key',
  "encrypted_api_key" = 'companyhelm-managed-openai-api-key',
  "base_url" = NULL,
  "refresh_token" = NULL,
  "access_token_expires_at" = NULL,
  "refreshed_at" = NULL,
  "status" = 'active',
  "error_message" = NULL,
  "updated_at" = NOW()
WHERE "is_managed" = true;
--> statement-breakpoint
WITH "companies_without_managed" AS (
  SELECT
    "companies"."id" AS "company_id",
    NOT EXISTS(
      SELECT 1
      FROM "model_provider_credentials" AS "existing_default"
      WHERE "existing_default"."company_id" = "companies"."id"
        AND "existing_default"."is_default" = true
    ) AS "should_be_default"
  FROM "companies"
  LEFT JOIN "model_provider_credentials" AS "managed_credential"
    ON "managed_credential"."company_id" = "companies"."id"
   AND "managed_credential"."is_managed" = true
  WHERE "managed_credential"."id" IS NULL
)
INSERT INTO "model_provider_credentials" (
  "id",
  "company_id",
  "name",
  "model_provider",
  "model_provider_credential_type",
  "encrypted_api_key",
  "base_url",
  "refresh_token",
  "access_token_expires_at",
  "refreshed_at",
  "is_default",
  "is_managed",
  "status",
  "error_message",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  "companies_without_managed"."company_id",
  'CompanyHelm',
  'companyhelm',
  'api_key',
  'companyhelm-managed-openai-api-key',
  NULL,
  NULL,
  NULL,
  NULL,
  "companies_without_managed"."should_be_default",
  true,
  'active',
  NULL,
  NOW(),
  NOW()
FROM "companies_without_managed";
--> statement-breakpoint
UPDATE "model_provider_credentials" AS "managed_credential"
SET "is_default" = true
WHERE "managed_credential"."is_managed" = true
  AND NOT EXISTS(
    SELECT 1
    FROM "model_provider_credentials" AS "existing_default"
    WHERE "existing_default"."company_id" = "managed_credential"."company_id"
      AND "existing_default"."is_default" = true
      AND "existing_default"."id" <> "managed_credential"."id"
  );
--> statement-breakpoint
WITH "seed_models" (
  "model_id",
  "name",
  "description",
  "reasoning_supported",
  "reasoning_levels"
) AS (
  VALUES
    ('gpt-5.4', 'GPT-5.4', 'Latest frontier agentic coding model.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.4-mini', 'GPT-5.4 Mini', 'Smaller frontier agentic coding model.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.3-codex', 'GPT-5.3 Codex', 'Frontier Codex-optimized agentic coding model.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.3-codex-spark', 'GPT-5.3 Codex Spark', 'Ultra-fast coding model.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.2-codex', 'GPT-5.2 Codex', 'Frontier agentic coding model.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.2', 'GPT-5.2', 'Optimized for professional work and long-running agents', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.1-codex-max', 'GPT-5.1 Codex Max', 'Codex-optimized model for deep and fast reasoning.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.1-codex-mini', 'GPT-5.1 Codex Mini', 'Optimized for codex. Cheaper, faster, but less capable.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[])
),
"managed_credentials" AS (
  SELECT
    "id",
    "company_id"
  FROM "model_provider_credentials"
  WHERE "is_managed" = true
)
INSERT INTO "model_provider_credential_models" (
  "id",
  "company_id",
  "model_provider_credential_id",
  "model_id",
  "name",
  "description",
  "reasoning_supported",
  "reasoning_levels",
  "is_default"
)
SELECT
  gen_random_uuid(),
  "managed_credentials"."company_id",
  "managed_credentials"."id",
  "seed_models"."model_id",
  "seed_models"."name",
  "seed_models"."description",
  "seed_models"."reasoning_supported",
  "seed_models"."reasoning_levels",
  false
FROM "managed_credentials"
CROSS JOIN "seed_models"
LEFT JOIN "model_provider_credential_models" AS "existing_model"
  ON "existing_model"."company_id" = "managed_credentials"."company_id"
 AND "existing_model"."model_provider_credential_id" = "managed_credentials"."id"
 AND "existing_model"."model_id" = "seed_models"."model_id"
WHERE "existing_model"."id" IS NULL;
--> statement-breakpoint
WITH "seed_models" (
  "model_id",
  "name",
  "description",
  "reasoning_supported",
  "reasoning_levels"
) AS (
  VALUES
    ('gpt-5.4', 'GPT-5.4', 'Latest frontier agentic coding model.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.4-mini', 'GPT-5.4 Mini', 'Smaller frontier agentic coding model.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.3-codex', 'GPT-5.3 Codex', 'Frontier Codex-optimized agentic coding model.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.3-codex-spark', 'GPT-5.3 Codex Spark', 'Ultra-fast coding model.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.2-codex', 'GPT-5.2 Codex', 'Frontier agentic coding model.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.2', 'GPT-5.2', 'Optimized for professional work and long-running agents', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.1-codex-max', 'GPT-5.1 Codex Max', 'Codex-optimized model for deep and fast reasoning.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[]),
    ('gpt-5.1-codex-mini', 'GPT-5.1 Codex Mini', 'Optimized for codex. Cheaper, faster, but less capable.', true, ARRAY['low', 'medium', 'high', 'xhigh']::text[])
)
UPDATE "model_provider_credential_models" AS "managed_model"
SET
  "name" = "seed_models"."name",
  "description" = "seed_models"."description",
  "reasoning_supported" = "seed_models"."reasoning_supported",
  "reasoning_levels" = "seed_models"."reasoning_levels"
FROM "model_provider_credentials" AS "managed_credential",
     "seed_models"
WHERE "managed_credential"."is_managed" = true
  AND "managed_model"."model_provider_credential_id" = "managed_credential"."id"
  AND "managed_model"."model_id" = "seed_models"."model_id";
--> statement-breakpoint
UPDATE "model_provider_credential_models" AS "managed_model"
SET "is_default" = false
FROM "model_provider_credentials" AS "managed_credential"
WHERE "managed_credential"."is_managed" = true
  AND "managed_model"."model_provider_credential_id" = "managed_credential"."id";
--> statement-breakpoint
UPDATE "model_provider_credential_models" AS "managed_model"
SET "is_default" = true
FROM "model_provider_credentials" AS "managed_credential"
WHERE "managed_credential"."is_managed" = true
  AND "managed_model"."model_provider_credential_id" = "managed_credential"."id"
  AND "managed_model"."model_id" = 'gpt-5.4';
