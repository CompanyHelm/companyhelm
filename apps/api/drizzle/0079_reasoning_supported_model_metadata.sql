ALTER TABLE "model_provider_credential_models"
ADD COLUMN IF NOT EXISTS "reasoning_supported" boolean;--> statement-breakpoint

UPDATE "model_provider_credential_models"
SET "reasoning_supported" = false
WHERE "reasoning_supported" IS NULL;--> statement-breakpoint

ALTER TABLE "model_provider_credential_models"
ALTER COLUMN "reasoning_supported" SET DEFAULT false;--> statement-breakpoint

ALTER TABLE "model_provider_credential_models"
ALTER COLUMN "reasoning_supported" SET NOT NULL;--> statement-breakpoint

UPDATE "model_provider_credential_models"
SET "reasoning_supported" = true
WHERE array_length("reasoning_levels", 1) IS NOT NULL
  AND array_length("reasoning_levels", 1) > 0;
