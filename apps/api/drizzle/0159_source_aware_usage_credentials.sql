ALTER TABLE "llm_usage_aggregates" ADD COLUMN "model_credential_source" "model_credential_source";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD COLUMN "platform_model_provider_credential_id" uuid;--> statement-breakpoint
UPDATE "llm_usage_aggregates"
SET "model_credential_source" = 'user_provided'
WHERE "scope_type" = 'model_provider_credential'
  AND "model_provider_credential_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD CONSTRAINT "llm_usage_aggregates_platform_model_provider_credential_id_platform_model_provider_credentials_id_fk" FOREIGN KEY ("platform_model_provider_credential_id") REFERENCES "public"."platform_model_provider_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP CONSTRAINT "llm_usage_aggregates_scope_reference_check";--> statement-breakpoint
DROP INDEX "llm_usage_aggregates_company_scope_period_uidx";--> statement-breakpoint
DROP INDEX "llm_usage_aggregates_model_provider_credential_scope_period_uidx";--> statement-breakpoint
CREATE INDEX "llm_usage_aggregates_platform_model_provider_credential_scope_idx" ON "llm_usage_aggregates" USING btree ("company_id","platform_model_provider_credential_id");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_aggregates_company_scope_period_uidx" ON "llm_usage_aggregates" USING btree ("company_id","scope_type","period","period_start") WHERE "llm_usage_aggregates"."scope_type" IN ('company', 'managed_model_provider_credential');--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_aggregates_model_provider_credential_scope_period_uidx" ON "llm_usage_aggregates" USING btree ("company_id","model_credential_source","model_provider_credential_id","period","period_start") WHERE "llm_usage_aggregates"."scope_type" = 'model_provider_credential' AND "llm_usage_aggregates"."model_credential_source" = 'user_provided';--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_aggregates_platform_model_provider_credential_scope_period_uidx" ON "llm_usage_aggregates" USING btree ("company_id","model_credential_source","platform_model_provider_credential_id","period","period_start") WHERE "llm_usage_aggregates"."scope_type" = 'model_provider_credential' AND "llm_usage_aggregates"."model_credential_source" = 'platform';--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD CONSTRAINT "llm_usage_aggregates_scope_reference_check" CHECK (
  (
    "scope_type" IN ('company', 'managed_model_provider_credential')
    AND "model_credential_source" IS NULL
    AND "model_provider_credential_id" IS NULL
    AND "platform_model_provider_credential_id" IS NULL
    AND "agent_id" IS NULL
    AND "session_id" IS NULL
  )
  OR
  (
    "scope_type" = 'model_provider_credential'
    AND "model_credential_source" = 'user_provided'
    AND "model_provider_credential_id" IS NOT NULL
    AND "platform_model_provider_credential_id" IS NULL
    AND "agent_id" IS NULL
    AND "session_id" IS NULL
  )
  OR
  (
    "scope_type" = 'model_provider_credential'
    AND "model_credential_source" = 'platform'
    AND "model_provider_credential_id" IS NULL
    AND "platform_model_provider_credential_id" IS NOT NULL
    AND "agent_id" IS NULL
    AND "session_id" IS NULL
  )
  OR
  (
    "scope_type" = 'agent'
    AND "model_credential_source" IS NULL
    AND "model_provider_credential_id" IS NULL
    AND "platform_model_provider_credential_id" IS NULL
    AND "agent_id" IS NOT NULL
    AND "session_id" IS NULL
  )
  OR
  (
    "scope_type" = 'session'
    AND "model_credential_source" IS NULL
    AND "model_provider_credential_id" IS NULL
    AND "platform_model_provider_credential_id" IS NULL
    AND "agent_id" IS NULL
    AND "session_id" IS NOT NULL
  )
);--> statement-breakpoint
