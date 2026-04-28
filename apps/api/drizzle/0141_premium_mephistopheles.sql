CREATE TABLE "platform_codex_rate_limit_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"platform_model_provider_credential_id" uuid NOT NULL,
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
TRUNCATE TABLE "codex_rate_limit_snapshots";
--> statement-breakpoint
DROP POLICY IF EXISTS "codex_rate_limit_snapshots_runtime_access_policy" ON "codex_rate_limit_snapshots";
--> statement-breakpoint
DROP INDEX "codex_rate_limit_snapshots_credential_idx";
--> statement-breakpoint
DROP INDEX "codex_rate_limit_snapshots_credential_limit_uidx";
--> statement-breakpoint
ALTER TABLE "codex_rate_limit_snapshots" ADD COLUMN "company_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "codex_rate_limit_snapshots" DROP COLUMN "credential_source";
--> statement-breakpoint
DROP TYPE "public"."codex_rate_limit_credential_source";
--> statement-breakpoint
ALTER TABLE "codex_rate_limit_snapshots" ADD CONSTRAINT "codex_rate_limit_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "codex_rate_limit_snapshots" ADD CONSTRAINT "codex_rate_limit_snapshots_credential_id_model_provider_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."model_provider_credentials"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "platform_codex_rate_limit_snapshots" ADD CONSTRAINT "platform_codex_rate_limit_snapshots_platform_model_provider_credential_id_platform_model_provider_credentials_id_fk" FOREIGN KEY ("platform_model_provider_credential_id") REFERENCES "public"."platform_model_provider_credentials"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "codex_rate_limit_snapshots_credential_idx" ON "codex_rate_limit_snapshots" USING btree ("company_id","credential_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "codex_rate_limit_snapshots_credential_limit_uidx" ON "codex_rate_limit_snapshots" USING btree ("company_id","credential_id","limit_id");
--> statement-breakpoint
CREATE INDEX "platform_codex_rate_limit_snapshots_credential_idx" ON "platform_codex_rate_limit_snapshots" USING btree ("platform_model_provider_credential_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_codex_rate_limit_snapshots_credential_limit_uidx" ON "platform_codex_rate_limit_snapshots" USING btree ("platform_model_provider_credential_id","limit_id");
--> statement-breakpoint
ALTER TABLE "platform_codex_rate_limit_snapshots" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "codex_rate_limit_snapshots_company_scope_policy"
ON "codex_rate_limit_snapshots"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "platform_codex_rate_limit_snapshots_runtime_access_policy"
ON "platform_codex_rate_limit_snapshots"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);
