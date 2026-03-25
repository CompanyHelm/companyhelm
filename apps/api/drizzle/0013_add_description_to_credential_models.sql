ALTER TABLE "model_provider_credential_models" ADD COLUMN "description" text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE "model_provider_credential_models"
SET "description" = CASE "model_id"
  WHEN 'gpt-5.4' THEN 'Latest frontier agentic coding model.'
  WHEN 'gpt-5.4-mini' THEN 'Smaller frontier agentic coding model.'
  WHEN 'gpt-5.3-codex' THEN 'Frontier Codex-optimized agentic coding model.'
  WHEN 'gpt-5.3-codex-spark' THEN 'Ultra-fast coding model.'
  WHEN 'gpt-5.2-codex' THEN 'Frontier agentic coding model.'
  WHEN 'gpt-5.2' THEN 'Optimized for professional work and long-running agents'
  WHEN 'gpt-5.1-codex-max' THEN 'Codex-optimized model for deep and fast reasoning.'
  WHEN 'gpt-5.1-codex-mini' THEN 'Optimized for codex. Cheaper, faster, but less capable.'
  WHEN 'claude-opus-4-6' THEN 'Opus 4.6 · Most capable for complex work'
  WHEN 'claude-sonnet-4-6' THEN 'Sonnet 4.6 · Best for everyday tasks'
  WHEN 'claude-haiku-4-5' THEN 'Haiku 4.5 · Fastest for quick answers'
  WHEN 'claude-haiku-4-5-20251001' THEN 'Haiku 4.5 · Fastest for quick answers'
  ELSE "name"
END
WHERE "description" = '';
--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" ALTER COLUMN "description" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" DROP COLUMN "created_at";
--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" DROP COLUMN "updated_at";
