ALTER TABLE "session_turns" ADD COLUMN "model_provider_credential_model_id" uuid REFERENCES "model_provider_credential_models"("id") ON DELETE SET NULL;
ALTER TABLE "session_turns" ADD COLUMN "reasoning_level" text;
ALTER TABLE "session_turns" ADD COLUMN "model_options" jsonb DEFAULT '{}'::jsonb NOT NULL;

UPDATE "session_turns" AS turn
SET
  "model_provider_credential_model_id" = session."current_model_provider_credential_model_id",
  "reasoning_level" = session."current_reasoning_level",
  "model_options" = session."current_model_options"
FROM "agent_sessions" AS session
WHERE turn."session_id" = session."id";
