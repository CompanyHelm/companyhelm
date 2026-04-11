CREATE TYPE "public"."model_provider_credential_status" AS ENUM('active', 'error');--> statement-breakpoint
ALTER TABLE "model_provider_credentials" ADD COLUMN "status" "model_provider_credential_status";--> statement-breakpoint
ALTER TABLE "model_provider_credentials" ADD COLUMN "error_message" text;--> statement-breakpoint
UPDATE "model_provider_credentials"
SET "status" = 'active'::"public"."model_provider_credential_status"
WHERE "status" IS NULL;--> statement-breakpoint
ALTER TABLE "model_provider_credentials" ALTER COLUMN "status" SET NOT NULL;
