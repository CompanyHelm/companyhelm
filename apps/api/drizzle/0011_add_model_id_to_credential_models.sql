ALTER TABLE "model_provider_credential_models" ADD COLUMN "model_id" text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE "model_provider_credential_models" SET "model_id" = "name" WHERE "model_id" = '';
--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" ALTER COLUMN "model_id" DROP DEFAULT;
