CREATE TYPE "public"."codex_rate_limit_credential_source" AS ENUM('platform', 'user_provided');--> statement-breakpoint
CREATE TABLE "codex_rate_limit_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"credential_source" "codex_rate_limit_credential_source" NOT NULL,
	"credential_id" uuid NOT NULL,
	"limit_id" text NOT NULL,
	"limit_name" text,
	"plan_type" text,
	"primary_used_percent" double precision,
	"primary_window_minutes" integer,
	"primary_resets_at" timestamp with time zone,
	"secondary_used_percent" double precision,
	"secondary_window_minutes" integer,
	"secondary_resets_at" timestamp with time zone,
	"credits_has_credits" boolean,
	"credits_unlimited" boolean,
	"credits_balance" text,
	"rate_limit_reached_type" text,
	"last_error" text,
	"refreshed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "codex_rate_limit_snapshots_credential_idx" ON "codex_rate_limit_snapshots" USING btree ("credential_source","credential_id");--> statement-breakpoint
CREATE UNIQUE INDEX "codex_rate_limit_snapshots_credential_limit_uidx" ON "codex_rate_limit_snapshots" USING btree ("credential_source","credential_id","limit_id");--> statement-breakpoint
ALTER TABLE "codex_rate_limit_snapshots" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "codex_rate_limit_snapshots_runtime_access_policy"
ON "codex_rate_limit_snapshots"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);
