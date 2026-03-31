CREATE TABLE "agent_environment_requirements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"min_cpu_count" integer NOT NULL,
	"min_memory_gb" integer NOT NULL,
	"min_disk_space_gb" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_environment_requirements" ADD CONSTRAINT "agent_environment_requirements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_environment_requirements" ADD CONSTRAINT "agent_environment_requirements_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_environment_requirements_company_id_idx" ON "agent_environment_requirements" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_environment_requirements_agent_id_uidx" ON "agent_environment_requirements" USING btree ("agent_id");