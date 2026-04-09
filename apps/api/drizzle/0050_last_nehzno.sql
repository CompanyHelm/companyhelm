CREATE TABLE "compute_provider_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"provider" "compute_provider" NOT NULL,
	"description" text,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "e2b_compute_provider_definitions" (
	"compute_provider_definition_id" uuid PRIMARY KEY NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"encryption_key_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_environments" ADD COLUMN "provider_definition_id" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "default_compute_provider_definition_id" uuid;--> statement-breakpoint
ALTER TABLE "compute_provider_definitions" ADD CONSTRAINT "compute_provider_definitions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compute_provider_definitions" ADD CONSTRAINT "compute_provider_definitions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compute_provider_definitions" ADD CONSTRAINT "compute_provider_definitions_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e2b_compute_provider_definitions" ADD CONSTRAINT "e2b_compute_provider_definitions_compute_provider_definition_id_compute_provider_definitions_id_fk" FOREIGN KEY ("compute_provider_definition_id") REFERENCES "public"."compute_provider_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compute_provider_definitions_company_id_idx" ON "compute_provider_definitions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "compute_provider_definitions_company_provider_idx" ON "compute_provider_definitions" USING btree ("company_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "compute_provider_definitions_company_name_lower_uidx" ON "compute_provider_definitions" USING btree ("company_id",lower("name"));--> statement-breakpoint
ALTER TABLE "agent_environments" ADD CONSTRAINT "agent_environments_provider_definition_id_compute_provider_definitions_id_fk" FOREIGN KEY ("provider_definition_id") REFERENCES "public"."compute_provider_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_default_compute_provider_definition_id_compute_provider_definitions_id_fk" FOREIGN KEY ("default_compute_provider_definition_id") REFERENCES "public"."compute_provider_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_environments_provider_definition_id_idx" ON "agent_environments" USING btree ("provider_definition_id");
