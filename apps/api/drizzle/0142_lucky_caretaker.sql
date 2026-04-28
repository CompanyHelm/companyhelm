ALTER TABLE "llm_usage_aggregates" ALTER COLUMN "scope_type" SET DATA TYPE text;--> statement-breakpoint
DROP INDEX "llm_usage_aggregates_company_scope_idx";--> statement-breakpoint
DROP INDEX "llm_usage_aggregates_company_scope_period_uidx";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD COLUMN "model_provider_credential_id" uuid;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD CONSTRAINT "llm_usage_aggregates_model_provider_credential_id_model_provider_credentials_id_fk" FOREIGN KEY ("model_provider_credential_id") REFERENCES "public"."model_provider_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD CONSTRAINT "llm_usage_aggregates_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD CONSTRAINT "llm_usage_aggregates_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
UPDATE "llm_usage_aggregates"
SET "agent_id" = "scope_id"
WHERE "scope_type" = 'agent';--> statement-breakpoint
UPDATE "llm_usage_aggregates"
SET "session_id" = "scope_id"
WHERE "scope_type" = 'session';--> statement-breakpoint
UPDATE "llm_usage_aggregates"
SET
  "scope_type" = 'model_provider_credential',
  "model_provider_credential_id" = "scope_id"
WHERE "scope_type" = 'provider'
  AND EXISTS (
    SELECT 1
    FROM "model_provider_credentials"
    WHERE "model_provider_credentials"."id" = "llm_usage_aggregates"."scope_id"
  );--> statement-breakpoint
WITH "platform_provider_rows" AS (
  SELECT *
  FROM "llm_usage_aggregates"
  WHERE "scope_type" = 'provider'
    AND NOT EXISTS (
      SELECT 1
      FROM "model_provider_credentials"
      WHERE "model_provider_credentials"."id" = "llm_usage_aggregates"."scope_id"
    )
),
"platform_provider_rollups" AS (
  SELECT
    "company_id",
    "period",
    "period_start",
    SUM("request_count") AS "request_count",
    SUM("input_tokens") AS "input_tokens",
    SUM("output_tokens") AS "output_tokens",
    SUM("cache_read_tokens") AS "cache_read_tokens",
    SUM("cache_write_tokens") AS "cache_write_tokens",
    SUM("total_tokens") AS "total_tokens",
    SUM("input_cost_nano_usd") AS "input_cost_nano_usd",
    SUM("output_cost_nano_usd") AS "output_cost_nano_usd",
    SUM("cache_read_cost_nano_usd") AS "cache_read_cost_nano_usd",
    SUM("cache_write_cost_nano_usd") AS "cache_write_cost_nano_usd",
    SUM("total_cost_nano_usd") AS "total_cost_nano_usd",
    SUM("input_cost_nano_virtual_usd") AS "input_cost_nano_virtual_usd",
    SUM("output_cost_nano_virtual_usd") AS "output_cost_nano_virtual_usd",
    SUM("cache_read_cost_nano_virtual_usd") AS "cache_read_cost_nano_virtual_usd",
    SUM("cache_write_cost_nano_virtual_usd") AS "cache_write_cost_nano_virtual_usd",
    SUM("total_cost_nano_virtual_usd") AS "total_cost_nano_virtual_usd",
    MIN("created_at") AS "created_at",
    MAX("updated_at") AS "updated_at"
  FROM "platform_provider_rows"
  GROUP BY "company_id", "period", "period_start"
),
"platform_provider_keepers" AS (
  SELECT DISTINCT ON ("company_id", "period", "period_start")
    "id",
    "company_id",
    "period",
    "period_start"
  FROM "platform_provider_rows"
  ORDER BY "company_id", "period", "period_start", "id"
)
UPDATE "llm_usage_aggregates"
SET
  "scope_type" = 'managed_model_provider_credential',
  "model_provider_credential_id" = NULL,
  "agent_id" = NULL,
  "session_id" = NULL,
  "request_count" = "platform_provider_rollups"."request_count",
  "input_tokens" = "platform_provider_rollups"."input_tokens",
  "output_tokens" = "platform_provider_rollups"."output_tokens",
  "cache_read_tokens" = "platform_provider_rollups"."cache_read_tokens",
  "cache_write_tokens" = "platform_provider_rollups"."cache_write_tokens",
  "total_tokens" = "platform_provider_rollups"."total_tokens",
  "input_cost_nano_usd" = "platform_provider_rollups"."input_cost_nano_usd",
  "output_cost_nano_usd" = "platform_provider_rollups"."output_cost_nano_usd",
  "cache_read_cost_nano_usd" = "platform_provider_rollups"."cache_read_cost_nano_usd",
  "cache_write_cost_nano_usd" = "platform_provider_rollups"."cache_write_cost_nano_usd",
  "total_cost_nano_usd" = "platform_provider_rollups"."total_cost_nano_usd",
  "input_cost_nano_virtual_usd" = "platform_provider_rollups"."input_cost_nano_virtual_usd",
  "output_cost_nano_virtual_usd" = "platform_provider_rollups"."output_cost_nano_virtual_usd",
  "cache_read_cost_nano_virtual_usd" = "platform_provider_rollups"."cache_read_cost_nano_virtual_usd",
  "cache_write_cost_nano_virtual_usd" = "platform_provider_rollups"."cache_write_cost_nano_virtual_usd",
  "total_cost_nano_virtual_usd" = "platform_provider_rollups"."total_cost_nano_virtual_usd",
  "created_at" = "platform_provider_rollups"."created_at",
  "updated_at" = "platform_provider_rollups"."updated_at"
FROM "platform_provider_keepers", "platform_provider_rollups"
WHERE "llm_usage_aggregates"."id" = "platform_provider_keepers"."id"
  AND "platform_provider_rollups"."company_id" = "platform_provider_keepers"."company_id"
  AND "platform_provider_rollups"."period" = "platform_provider_keepers"."period"
  AND "platform_provider_rollups"."period_start" = "platform_provider_keepers"."period_start";--> statement-breakpoint
DELETE FROM "llm_usage_aggregates"
WHERE "scope_type" = 'provider';--> statement-breakpoint
DROP TYPE "public"."llm_usage_aggregate_scope";--> statement-breakpoint
CREATE TYPE "public"."llm_usage_aggregate_scope" AS ENUM('company', 'managed_model_provider_credential', 'model_provider_credential', 'agent', 'session');--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ALTER COLUMN "scope_type" SET DATA TYPE "public"."llm_usage_aggregate_scope" USING "scope_type"::"public"."llm_usage_aggregate_scope";--> statement-breakpoint
CREATE INDEX "llm_usage_aggregates_agent_scope_idx" ON "llm_usage_aggregates" USING btree ("company_id","agent_id");--> statement-breakpoint
CREATE INDEX "llm_usage_aggregates_model_provider_credential_scope_idx" ON "llm_usage_aggregates" USING btree ("company_id","model_provider_credential_id");--> statement-breakpoint
CREATE INDEX "llm_usage_aggregates_session_scope_idx" ON "llm_usage_aggregates" USING btree ("company_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_aggregates_model_provider_credential_scope_period_uidx" ON "llm_usage_aggregates" USING btree ("company_id","model_provider_credential_id","period","period_start") WHERE "llm_usage_aggregates"."scope_type" = 'model_provider_credential';--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_aggregates_agent_scope_period_uidx" ON "llm_usage_aggregates" USING btree ("company_id","agent_id","period","period_start") WHERE "llm_usage_aggregates"."scope_type" = 'agent';--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_aggregates_session_scope_period_uidx" ON "llm_usage_aggregates" USING btree ("company_id","session_id","period","period_start") WHERE "llm_usage_aggregates"."scope_type" = 'session';--> statement-breakpoint
CREATE INDEX "llm_usage_aggregates_company_scope_idx" ON "llm_usage_aggregates" USING btree ("company_id","scope_type");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_aggregates_company_scope_period_uidx" ON "llm_usage_aggregates" USING btree ("company_id","scope_type","period","period_start") WHERE "llm_usage_aggregates"."scope_type" IN ('company', 'managed_model_provider_credential');--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" DROP COLUMN "scope_id";--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD CONSTRAINT "llm_usage_aggregates_scope_reference_check" CHECK ((
      ("llm_usage_aggregates"."scope_type" IN ('company', 'managed_model_provider_credential') AND "llm_usage_aggregates"."model_provider_credential_id" IS NULL AND "llm_usage_aggregates"."agent_id" IS NULL AND "llm_usage_aggregates"."session_id" IS NULL)
      OR
      ("llm_usage_aggregates"."scope_type" = 'model_provider_credential' AND "llm_usage_aggregates"."model_provider_credential_id" IS NOT NULL AND "llm_usage_aggregates"."agent_id" IS NULL AND "llm_usage_aggregates"."session_id" IS NULL)
      OR
      ("llm_usage_aggregates"."scope_type" = 'agent' AND "llm_usage_aggregates"."model_provider_credential_id" IS NULL AND "llm_usage_aggregates"."agent_id" IS NOT NULL AND "llm_usage_aggregates"."session_id" IS NULL)
      OR
      ("llm_usage_aggregates"."scope_type" = 'session' AND "llm_usage_aggregates"."model_provider_credential_id" IS NULL AND "llm_usage_aggregates"."agent_id" IS NULL AND "llm_usage_aggregates"."session_id" IS NOT NULL)
    ));
