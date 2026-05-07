ALTER TABLE "session_turns" ADD COLUMN "usage_input_cost_nano_virtual_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_output_cost_nano_virtual_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_cache_read_cost_nano_virtual_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_cache_write_cost_nano_virtual_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "usage_total_cost_nano_virtual_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD COLUMN "input_cost_nano_virtual_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD COLUMN "output_cost_nano_virtual_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD COLUMN "cache_read_cost_nano_virtual_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD COLUMN "cache_write_cost_nano_virtual_usd" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usage_aggregates" ADD COLUMN "total_cost_nano_virtual_usd" bigint DEFAULT 0 NOT NULL;
