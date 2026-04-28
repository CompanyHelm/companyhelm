DROP INDEX IF EXISTS "platform_model_provider_credentials_default_uidx";
--> statement-breakpoint
ALTER TABLE "platform_model_provider_credentials" DROP COLUMN IF EXISTS "is_default";
