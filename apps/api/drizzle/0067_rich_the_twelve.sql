ALTER TABLE "compute_provider_definitions" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "model_provider_credentials" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
WITH ranked_compute_provider_definitions AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "company_id"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
    ) AS "rank"
  FROM "compute_provider_definitions"
)
UPDATE "compute_provider_definitions"
SET "is_default" = true
FROM ranked_compute_provider_definitions
WHERE "compute_provider_definitions"."id" = ranked_compute_provider_definitions."id"
  AND ranked_compute_provider_definitions."rank" = 1;--> statement-breakpoint
WITH ranked_model_provider_credentials AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "company_id"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
    ) AS "rank"
  FROM "model_provider_credentials"
)
UPDATE "model_provider_credentials"
SET "is_default" = true
FROM ranked_model_provider_credentials
WHERE "model_provider_credentials"."id" = ranked_model_provider_credentials."id"
  AND ranked_model_provider_credentials."rank" = 1;--> statement-breakpoint
WITH ranked_model_provider_credential_models AS (
  SELECT
    "model_provider_credential_models"."id",
    ROW_NUMBER() OVER (
      PARTITION BY "model_provider_credential_models"."model_provider_credential_id"
      ORDER BY
        CASE
          WHEN "model_provider_credentials"."model_provider"::text IN ('openai', 'openai-codex')
            AND "model_provider_credential_models"."model_id" = 'gpt-5.4'
            THEN 0
          WHEN "model_provider_credentials"."model_provider"::text = 'anthropic'
            AND "model_provider_credential_models"."model_id" = 'claude-opus-4-6'
            THEN 0
          ELSE 1
        END,
        "model_provider_credential_models"."name" ASC,
        "model_provider_credential_models"."id" ASC
    ) AS "rank"
  FROM "model_provider_credential_models"
  INNER JOIN "model_provider_credentials"
    ON "model_provider_credentials"."id" = "model_provider_credential_models"."model_provider_credential_id"
)
UPDATE "model_provider_credential_models"
SET "is_default" = true
FROM ranked_model_provider_credential_models
WHERE "model_provider_credential_models"."id" = ranked_model_provider_credential_models."id"
  AND ranked_model_provider_credential_models."rank" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX "compute_provider_definitions_company_default_uidx" ON "compute_provider_definitions" USING btree ("company_id") WHERE "compute_provider_definitions"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "model_provider_credential_models_credential_default_uidx" ON "model_provider_credential_models" USING btree ("model_provider_credential_id") WHERE "model_provider_credential_models"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "model_provider_credentials_company_default_uidx" ON "model_provider_credentials" USING btree ("company_id") WHERE "model_provider_credentials"."is_default";
