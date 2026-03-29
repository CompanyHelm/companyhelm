ALTER TABLE "agent_sessions" ADD COLUMN "current_model_provider_credential_id" uuid;--> statement-breakpoint
UPDATE "agent_sessions"
SET "current_model_provider_credential_id" = COALESCE(
  (
    SELECT "model_provider_credential_models"."model_provider_credential_id"
    FROM "agents"
    JOIN "model_provider_credential_models"
      ON "model_provider_credential_models"."id" = "agents"."default_model_provider_credential_model_id"
    WHERE "agents"."id" = "agent_sessions"."agent_id"
  ),
  (
    SELECT "model_provider_credential_models"."model_provider_credential_id"
    FROM "model_provider_credential_models"
    WHERE "model_provider_credential_models"."company_id" = "agent_sessions"."company_id"
      AND "model_provider_credential_models"."model_id" = "agent_sessions"."current_model_id"
    ORDER BY "model_provider_credential_models"."id"
    LIMIT 1
  )
)
WHERE "agent_sessions"."current_model_provider_credential_id" IS NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "current_model_provider_credential_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_current_model_credential_fk" FOREIGN KEY ("current_model_provider_credential_id") REFERENCES "public"."model_provider_credentials"("id") ON DELETE restrict ON UPDATE no action;
