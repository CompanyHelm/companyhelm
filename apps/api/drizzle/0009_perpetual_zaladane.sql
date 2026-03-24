CREATE TABLE "model_provider_credential_models" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"model_provider_credential_id" uuid NOT NULL,
	"name" text NOT NULL,
	"reasoning_levels" text[],
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" ADD CONSTRAINT "model_provider_credential_models_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" ADD CONSTRAINT "model_provider_credential_models_model_provider_credential_id_model_provider_credentials_id_fk" FOREIGN KEY ("model_provider_credential_id") REFERENCES "public"."model_provider_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "model_provider_credential_models_company_id_idx" ON "model_provider_credential_models" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "model_provider_credential_models_model_provider_credential_id_idx" ON "model_provider_credential_models" USING btree ("model_provider_credential_id");