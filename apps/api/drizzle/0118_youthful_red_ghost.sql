CREATE TYPE "public"."llm_usage_aggregate_period" AS ENUM('total', 'day', 'month');--> statement-breakpoint
CREATE TYPE "public"."llm_usage_aggregate_scope" AS ENUM('company', 'agent', 'session');--> statement-breakpoint
CREATE TABLE "llm_usage_aggregates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"scope_type" "llm_usage_aggregate_scope" NOT NULL,
	"scope_id" uuid NOT NULL,
	"period" "llm_usage_aggregate_period" NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"request_count" bigint DEFAULT 0 NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"cache_read_tokens" bigint DEFAULT 0 NOT NULL,
	"cache_write_tokens" bigint DEFAULT 0 NOT NULL,
	"total_tokens" bigint DEFAULT 0 NOT NULL,
	"input_cost_nano_usd" bigint DEFAULT 0 NOT NULL,
	"output_cost_nano_usd" bigint DEFAULT 0 NOT NULL,
	"cache_read_cost_nano_usd" bigint DEFAULT 0 NOT NULL,
	"cache_write_cost_nano_usd" bigint DEFAULT 0 NOT NULL,
	"total_cost_nano_usd" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_input_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_output_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_cache_read_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_cache_write_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_total_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_input_cost_nano_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_output_cost_nano_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_cache_read_cost_nano_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_cache_write_cost_nano_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_total_cost_nano_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_recorded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD CONSTRAINT "llm_usage_aggregates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "llm_usage_aggregates_company_scope_idx" ON "llm_usage_aggregates" USING btree ("company_id","scope_type","scope_id");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_aggregates_company_scope_period_uidx" ON "llm_usage_aggregates" USING btree ("company_id","scope_type","scope_id","period","period_start");--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "llm_usage_aggregates_company_scope_policy"
ON "llm_usage_aggregates"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
