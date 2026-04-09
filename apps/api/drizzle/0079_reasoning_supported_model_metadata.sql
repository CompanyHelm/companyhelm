ALTER TABLE "model_provider_credential_models"
ADD COLUMN "reasoning_supported" boolean DEFAULT false NOT NULL;

UPDATE "model_provider_credential_models"
SET "reasoning_supported" = true
WHERE array_length("reasoning_levels", 1) IS NOT NULL
  AND array_length("reasoning_levels", 1) > 0;
