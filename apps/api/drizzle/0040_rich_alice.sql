ALTER TABLE "agent_sessions" DROP CONSTRAINT "agent_sessions_current_model_provider_credential_id_model_provider_credentials_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "current_model_provider_credential_model_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_current_model_provider_credential_model_id_model_provider_credential_models_id_fk" FOREIGN KEY ("current_model_provider_credential_model_id") REFERENCES "public"."model_provider_credential_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP COLUMN "current_model_id";--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP COLUMN "current_model_provider_credential_id";