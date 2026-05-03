DROP POLICY IF EXISTS "agents_platform_admin_access_policy" ON "agents";--> statement-breakpoint
DROP POLICY IF EXISTS "agent_sessions_platform_admin_access_policy" ON "agent_sessions";--> statement-breakpoint
DROP POLICY IF EXISTS "company_members_platform_admin_access_policy" ON "company_members";--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT IF EXISTS "agents_default_platform_model_id_platform_models_id_fk";--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP CONSTRAINT IF EXISTS "agent_sessions_current_platform_model_id_platform_models_id_fk";--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP CONSTRAINT IF EXISTS "agent_sessions_current_platform_model_provider_credential_model_id_platform_model_provider_credential_models_id_fk";--> statement-breakpoint
ALTER TABLE "session_turns" DROP CONSTRAINT IF EXISTS "session_turns_platform_model_id_platform_models_id_fk";--> statement-breakpoint
ALTER TABLE "session_turns" DROP CONSTRAINT IF EXISTS "session_turns_platform_model_provider_credential_model_id_platform_model_provider_credential_models_id_fk";--> statement-breakpoint
ALTER TABLE "session_turns" DROP CONSTRAINT IF EXISTS "session_turns_platform_model_provider_credential_id_platform_model_provider_credentials_id_fk";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP CONSTRAINT IF EXISTS "llm_usage_aggregates_platform_model_provider_credential_id_platform_model_provider_credentials_id_fk";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP CONSTRAINT IF EXISTS "llm_usage_aggregates_scope_reference_check";--> statement-breakpoint
DROP INDEX IF EXISTS "llm_usage_aggregates_company_scope_period_uidx";--> statement-breakpoint
DROP INDEX IF EXISTS "llm_usage_aggregates_model_provider_credential_scope_period_uidx";--> statement-breakpoint
DROP INDEX IF EXISTS "llm_usage_aggregates_platform_model_provider_credential_scope_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "llm_usage_aggregates_platform_model_provider_credential_scope_period_uidx";--> statement-breakpoint
DELETE FROM "company_model_provider_defaults" WHERE "model_provider_credential_id" IS NULL;--> statement-breakpoint
ALTER TABLE "company_model_provider_defaults" DROP CONSTRAINT IF EXISTS "company_model_provider_defaults_source_check";--> statement-breakpoint
ALTER TABLE "company_model_provider_defaults" ALTER COLUMN "model_provider_credential_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "company_model_provider_defaults" DROP COLUMN IF EXISTS "model_credential_source";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN IF EXISTS "default_model_credential_source";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN IF EXISTS "default_platform_model_id";--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP COLUMN IF EXISTS "current_model_credential_source";--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP COLUMN IF EXISTS "current_platform_model_id";--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP COLUMN IF EXISTS "current_platform_model_provider_credential_model_id";--> statement-breakpoint
ALTER TABLE "session_turns" DROP COLUMN IF EXISTS "platform_model_id";--> statement-breakpoint
ALTER TABLE "session_turns" DROP COLUMN IF EXISTS "platform_model_provider_credential_model_id";--> statement-breakpoint
ALTER TABLE "session_turns" DROP COLUMN IF EXISTS "platform_model_provider_credential_id";--> statement-breakpoint
ALTER TABLE "session_turns" DROP COLUMN IF EXISTS "usage_input_cost_nano_virtual_usd";--> statement-breakpoint
ALTER TABLE "session_turns" DROP COLUMN IF EXISTS "usage_output_cost_nano_virtual_usd";--> statement-breakpoint
ALTER TABLE "session_turns" DROP COLUMN IF EXISTS "usage_cache_read_cost_nano_virtual_usd";--> statement-breakpoint
ALTER TABLE "session_turns" DROP COLUMN IF EXISTS "usage_cache_write_cost_nano_virtual_usd";--> statement-breakpoint
ALTER TABLE "session_turns" DROP COLUMN IF EXISTS "usage_total_cost_nano_virtual_usd";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP COLUMN IF EXISTS "model_credential_source";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP COLUMN IF EXISTS "platform_model_provider_credential_id";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP COLUMN IF EXISTS "input_cost_nano_virtual_usd";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP COLUMN IF EXISTS "output_cost_nano_virtual_usd";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP COLUMN IF EXISTS "cache_read_cost_nano_virtual_usd";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP COLUMN IF EXISTS "cache_write_cost_nano_virtual_usd";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP COLUMN IF EXISTS "total_cost_nano_virtual_usd";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN IF EXISTS "plan";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN IF EXISTS "pending_plan";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN IF EXISTS "pending_plan_effective_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_platform_admin";--> statement-breakpoint
DROP TABLE IF EXISTS "platform_codex_rate_limit_snapshots" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "company_managed_model_provider_settings" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "platform_model_routes" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "platform_models" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "platform_model_provider_credential_models" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "platform_model_provider_credentials" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "platform_admins" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "wallet_transactions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "wallets" CASCADE;--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_aggregates_company_scope_period_uidx" ON "llm_usage_aggregates" USING btree ("company_id","scope_type","period","period_start") WHERE "llm_usage_aggregates"."scope_type" = 'company';--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_aggregates_model_provider_credential_scope_period_uidx" ON "llm_usage_aggregates" USING btree ("company_id","model_provider_credential_id","period","period_start") WHERE "llm_usage_aggregates"."scope_type" = 'model_provider_credential';--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD CONSTRAINT "llm_usage_aggregates_scope_reference_check" CHECK (
  (
    "scope_type" = 'company'
    AND "model_provider_credential_id" IS NULL
    AND "agent_id" IS NULL
    AND "session_id" IS NULL
  )
  OR
  (
    "scope_type" = 'model_provider_credential'
    AND "model_provider_credential_id" IS NOT NULL
    AND "agent_id" IS NULL
    AND "session_id" IS NULL
  )
  OR
  (
    "scope_type" = 'agent'
    AND "model_provider_credential_id" IS NULL
    AND "agent_id" IS NOT NULL
    AND "session_id" IS NULL
  )
  OR
  (
    "scope_type" = 'session'
    AND "model_provider_credential_id" IS NULL
    AND "agent_id" IS NULL
    AND "session_id" IS NOT NULL
  )
);--> statement-breakpoint
DROP TYPE IF EXISTS "public"."wallet_transaction_category";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."wallet_type";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."company_subscription_plan";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."model_credential_source";
