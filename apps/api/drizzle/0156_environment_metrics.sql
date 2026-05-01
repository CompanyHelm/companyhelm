ALTER TABLE "agent_environments" ADD COLUMN "metrics_sampled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agent_environments" ADD COLUMN "cpu_used_pct" double precision;--> statement-breakpoint
ALTER TABLE "agent_environments" ADD COLUMN "mem_used_bytes" bigint;--> statement-breakpoint
ALTER TABLE "agent_environments" ADD COLUMN "disk_used_bytes" bigint;--> statement-breakpoint
CREATE TABLE "agent_environment_metric_samples" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"sampled_at" timestamp with time zone NOT NULL,
	"cpu_used_pct" double precision,
	"mem_used_bytes" bigint,
	"disk_used_bytes" bigint,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_environment_metric_samples" ADD CONSTRAINT "agent_environment_metric_samples_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_environment_metric_samples" ADD CONSTRAINT "agent_env_metric_samples_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."agent_environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_environment_metric_samples_company_sampled_at_idx" ON "agent_environment_metric_samples" USING btree ("company_id","sampled_at");--> statement-breakpoint
CREATE INDEX "agent_environment_metric_samples_environment_sampled_at_idx" ON "agent_environment_metric_samples" USING btree ("environment_id","sampled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_environment_metric_samples_environment_sampled_at_uidx" ON "agent_environment_metric_samples" USING btree ("environment_id","sampled_at");--> statement-breakpoint
ALTER TABLE "agent_environment_metric_samples" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "agent_environment_metric_samples_company_scope_policy"
ON "agent_environment_metric_samples"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
