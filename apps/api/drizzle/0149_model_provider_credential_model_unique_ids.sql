WITH duplicate_model_provider_credential_models AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "model_provider_credential_id", "model_id"
      ORDER BY "is_default" DESC, "id" ASC
    ) AS "survivor_id"
  FROM "model_provider_credential_models"
)
UPDATE "agents"
SET "default_model_provider_credential_model_id" = duplicate_model_provider_credential_models."survivor_id"
FROM duplicate_model_provider_credential_models
WHERE "agents"."default_model_provider_credential_model_id" = duplicate_model_provider_credential_models."id"
  AND duplicate_model_provider_credential_models."id" <> duplicate_model_provider_credential_models."survivor_id";
--> statement-breakpoint
WITH duplicate_model_provider_credential_models AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "model_provider_credential_id", "model_id"
      ORDER BY "is_default" DESC, "id" ASC
    ) AS "survivor_id"
  FROM "model_provider_credential_models"
)
UPDATE "agent_sessions"
SET "current_model_provider_credential_model_id" = duplicate_model_provider_credential_models."survivor_id"
FROM duplicate_model_provider_credential_models
WHERE "agent_sessions"."current_model_provider_credential_model_id" = duplicate_model_provider_credential_models."id"
  AND duplicate_model_provider_credential_models."id" <> duplicate_model_provider_credential_models."survivor_id";
--> statement-breakpoint
WITH ranked_model_provider_credential_models AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "model_provider_credential_id", "model_id"
      ORDER BY "is_default" DESC, "id" ASC
    ) AS "rank"
  FROM "model_provider_credential_models"
)
DELETE FROM "model_provider_credential_models"
USING ranked_model_provider_credential_models
WHERE "model_provider_credential_models"."id" = ranked_model_provider_credential_models."id"
  AND ranked_model_provider_credential_models."rank" > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "model_provider_credential_models_credential_model_uidx"
  ON "model_provider_credential_models" USING btree ("model_provider_credential_id", "model_id");
