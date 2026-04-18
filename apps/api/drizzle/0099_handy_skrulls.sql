ALTER TYPE "public"."model_provider" ADD VALUE 'openai-compatible' BEFORE 'google-gemini-cli';--> statement-breakpoint
ALTER TABLE "model_provider_credentials" ADD COLUMN "base_url" text;