CREATE TABLE "image_provider_credential_models" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"model_provider_credential_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"output_mime_types" text[] NOT NULL,
	"supported_qualities" text[] NOT NULL,
	"supported_sizes" text[] NOT NULL,
	"supports_editing" boolean DEFAULT false NOT NULL,
	"supports_flexible_sizes" boolean DEFAULT false NOT NULL,
	"supports_transparent_background" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "default_image_provider_credential_model_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "image_provider_credential_models" ADD CONSTRAINT "image_provider_credential_models_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_provider_credential_models" ADD CONSTRAINT "image_provider_credential_models_model_provider_credential_id_model_provider_credentials_id_fk" FOREIGN KEY ("model_provider_credential_id") REFERENCES "public"."model_provider_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "image_provider_credential_models_company_id_idx" ON "image_provider_credential_models" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "image_provider_credential_models_credential_id_idx" ON "image_provider_credential_models" USING btree ("model_provider_credential_id");--> statement-breakpoint
CREATE UNIQUE INDEX "image_provider_credential_models_credential_model_uidx" ON "image_provider_credential_models" USING btree ("model_provider_credential_id","model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "image_provider_credential_models_credential_default_uidx" ON "image_provider_credential_models" USING btree ("model_provider_credential_id") WHERE "image_provider_credential_models"."is_default";--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_default_image_provider_credential_model_id_image_provider_credential_models_id_fk" FOREIGN KEY ("default_image_provider_credential_model_id") REFERENCES "public"."image_provider_credential_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_company_status_completed_at_idx" ON "tasks" USING btree ("company_id","status","completed_at");