CREATE TABLE "company_managed_model_provider_settings" (
	"company_id" uuid NOT NULL,
	"provider_key" text NOT NULL,
	"default_platform_model_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "company_managed_model_provider_settings_pk" PRIMARY KEY("company_id","provider_key"),
	CONSTRAINT "company_managed_model_provider_settings_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "company_managed_model_provider_settings_default_model_fk" FOREIGN KEY ("default_platform_model_id") REFERENCES "public"."platform_models"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "company_managed_model_provider_settings_default_model_idx" ON "company_managed_model_provider_settings" USING btree ("default_platform_model_id");
