CREATE TYPE "public"."model_provider_credential_type" AS ENUM('api_key', 'oauth_token');--> statement-breakpoint
CREATE TABLE "model_provider_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"model_provider" "model_provider" NOT NULL,
	"model_provider_credential_type" "model_provider_credential_type" NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"refresh_token" text,
	"refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_api_keys" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "model_oauth_tokens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "model_api_keys" CASCADE;--> statement-breakpoint
DROP TABLE "model_oauth_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "agents_model_api_key_id_or_oauth_token_id_check";--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "agents_model_api_key_id_model_api_keys_id_fk";
--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "agents_model_oauth_token_id_model_oauth_tokens_id_fk";
--> statement-breakpoint
ALTER TABLE "model_provider_credentials" ADD CONSTRAINT "model_provider_credentials_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "model_api_key_id";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "model_oauth_token_id";