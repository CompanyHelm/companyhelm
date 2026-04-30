DELETE FROM "llm_usage_aggregates"
WHERE "scope_type" = 'managed_model_provider_credential';
--> statement-breakpoint
WITH "platform_turns" AS (
  SELECT
    "company_id",
    "usage_recorded_at",
    "usage_input_tokens",
    "usage_output_tokens",
    "usage_cache_read_tokens",
    "usage_cache_write_tokens",
    "usage_total_tokens",
    "usage_input_cost_nano_usd",
    "usage_output_cost_nano_usd",
    "usage_cache_read_cost_nano_usd",
    "usage_cache_write_cost_nano_usd",
    "usage_total_cost_nano_usd",
    "usage_input_cost_nano_virtual_usd",
    "usage_output_cost_nano_virtual_usd",
    "usage_cache_read_cost_nano_virtual_usd",
    "usage_cache_write_cost_nano_virtual_usd",
    "usage_total_cost_nano_virtual_usd"
  FROM "session_turns"
  WHERE "platform_model_provider_credential_id" IS NOT NULL
    AND "usage_recorded_at" IS NOT NULL
    AND (
      "usage_total_tokens" > 0
      OR "usage_total_cost_nano_usd" > 0
      OR "usage_total_cost_nano_virtual_usd" > 0
    )
),
"managed_periods" AS (
  SELECT
    "company_id",
    'total'::"llm_usage_aggregate_period" AS "period",
    TIMESTAMPTZ '1970-01-01 00:00:00+00' AS "period_start",
    "usage_recorded_at",
    "usage_input_tokens",
    "usage_output_tokens",
    "usage_cache_read_tokens",
    "usage_cache_write_tokens",
    "usage_total_tokens",
    "usage_input_cost_nano_usd",
    "usage_output_cost_nano_usd",
    "usage_cache_read_cost_nano_usd",
    "usage_cache_write_cost_nano_usd",
    "usage_total_cost_nano_usd",
    "usage_input_cost_nano_virtual_usd",
    "usage_output_cost_nano_virtual_usd",
    "usage_cache_read_cost_nano_virtual_usd",
    "usage_cache_write_cost_nano_virtual_usd",
    "usage_total_cost_nano_virtual_usd"
  FROM "platform_turns"
  UNION ALL
  SELECT
    "company_id",
    'day'::"llm_usage_aggregate_period" AS "period",
    date_trunc('day', "usage_recorded_at" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS "period_start",
    "usage_recorded_at",
    "usage_input_tokens",
    "usage_output_tokens",
    "usage_cache_read_tokens",
    "usage_cache_write_tokens",
    "usage_total_tokens",
    "usage_input_cost_nano_usd",
    "usage_output_cost_nano_usd",
    "usage_cache_read_cost_nano_usd",
    "usage_cache_write_cost_nano_usd",
    "usage_total_cost_nano_usd",
    "usage_input_cost_nano_virtual_usd",
    "usage_output_cost_nano_virtual_usd",
    "usage_cache_read_cost_nano_virtual_usd",
    "usage_cache_write_cost_nano_virtual_usd",
    "usage_total_cost_nano_virtual_usd"
  FROM "platform_turns"
  UNION ALL
  SELECT
    "company_id",
    'month'::"llm_usage_aggregate_period" AS "period",
    date_trunc('month', "usage_recorded_at" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS "period_start",
    "usage_recorded_at",
    "usage_input_tokens",
    "usage_output_tokens",
    "usage_cache_read_tokens",
    "usage_cache_write_tokens",
    "usage_total_tokens",
    "usage_input_cost_nano_usd",
    "usage_output_cost_nano_usd",
    "usage_cache_read_cost_nano_usd",
    "usage_cache_write_cost_nano_usd",
    "usage_total_cost_nano_usd",
    "usage_input_cost_nano_virtual_usd",
    "usage_output_cost_nano_virtual_usd",
    "usage_cache_read_cost_nano_virtual_usd",
    "usage_cache_write_cost_nano_virtual_usd",
    "usage_total_cost_nano_virtual_usd"
  FROM "platform_turns"
)
INSERT INTO "llm_usage_aggregates" (
  "id",
  "company_id",
  "scope_type",
  "model_provider_credential_id",
  "agent_id",
  "session_id",
  "period",
  "period_start",
  "request_count",
  "input_tokens",
  "output_tokens",
  "cache_read_tokens",
  "cache_write_tokens",
  "total_tokens",
  "input_cost_nano_usd",
  "output_cost_nano_usd",
  "cache_read_cost_nano_usd",
  "cache_write_cost_nano_usd",
  "total_cost_nano_usd",
  "input_cost_nano_virtual_usd",
  "output_cost_nano_virtual_usd",
  "cache_read_cost_nano_virtual_usd",
  "cache_write_cost_nano_virtual_usd",
  "total_cost_nano_virtual_usd",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  "company_id",
  'managed_model_provider_credential',
  NULL,
  NULL,
  NULL,
  "period",
  "period_start",
  count(*),
  sum("usage_input_tokens"),
  sum("usage_output_tokens"),
  sum("usage_cache_read_tokens"),
  sum("usage_cache_write_tokens"),
  sum("usage_total_tokens"),
  sum("usage_input_cost_nano_usd"),
  sum("usage_output_cost_nano_usd"),
  sum("usage_cache_read_cost_nano_usd"),
  sum("usage_cache_write_cost_nano_usd"),
  sum("usage_total_cost_nano_usd"),
  sum("usage_input_cost_nano_virtual_usd"),
  sum("usage_output_cost_nano_virtual_usd"),
  sum("usage_cache_read_cost_nano_virtual_usd"),
  sum("usage_cache_write_cost_nano_virtual_usd"),
  sum("usage_total_cost_nano_virtual_usd"),
  min("usage_recorded_at"),
  max("usage_recorded_at")
FROM "managed_periods"
GROUP BY "company_id", "period", "period_start";
