ALTER TABLE "agents" DROP COLUMN IF EXISTS "default_model_name";--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "default_model_provider_credential_model_id" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_default_model_provider_credential_model_id_model_provider_credential_models_id_fk" FOREIGN KEY ("default_model_provider_credential_model_id") REFERENCES "public"."model_provider_credential_models"("id") ON DELETE set null ON UPDATE no action;
