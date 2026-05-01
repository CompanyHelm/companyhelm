DELETE FROM "platform_models"
WHERE "model_provider"::text = 'google-gemini-cli';--> statement-breakpoint
DELETE FROM "platform_model_provider_credentials"
WHERE "model_provider"::text = 'google-gemini-cli';--> statement-breakpoint
DELETE FROM "model_provider_credentials"
WHERE "model_provider"::text = 'google-gemini-cli';--> statement-breakpoint
ALTER TABLE "model_provider_credentials" ALTER COLUMN "model_provider" SET DATA TYPE text USING "model_provider"::text;--> statement-breakpoint
ALTER TABLE "platform_model_provider_credentials" ALTER COLUMN "model_provider" SET DATA TYPE text USING "model_provider"::text;--> statement-breakpoint
ALTER TABLE "platform_models" ALTER COLUMN "model_provider" SET DATA TYPE text USING "model_provider"::text;--> statement-breakpoint
DROP TYPE "public"."model_provider";--> statement-breakpoint
CREATE TYPE "public"."model_provider" AS ENUM('openai', 'anthropic', 'openai-codex', 'openrouter', 'openai-compatible', 'google', 'companyhelm');--> statement-breakpoint
ALTER TABLE "model_provider_credentials" ALTER COLUMN "model_provider" SET DATA TYPE "public"."model_provider" USING "model_provider"::"public"."model_provider";--> statement-breakpoint
ALTER TABLE "platform_model_provider_credentials" ALTER COLUMN "model_provider" SET DATA TYPE "public"."model_provider" USING "model_provider"::"public"."model_provider";--> statement-breakpoint
ALTER TABLE "platform_models" ALTER COLUMN "model_provider" SET DATA TYPE "public"."model_provider" USING "model_provider"::"public"."model_provider";
