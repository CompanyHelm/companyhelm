CREATE TABLE "platform_model_provider_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"model_provider" "model_provider" NOT NULL,
	"model_provider_credential_type" "model_provider_credential_type" NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"base_url" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refreshed_at" timestamp with time zone,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" "model_provider_credential_status" NOT NULL,
	"error_message" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_model_provider_credential_models" (
	"id" uuid PRIMARY KEY NOT NULL,
	"platform_model_provider_credential_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"reasoning_supported" boolean DEFAULT false NOT NULL,
	"reasoning_levels" text[],
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_model_provider_credentials" ADD CONSTRAINT "platform_model_provider_credentials_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "platform_model_provider_credential_models" ADD CONSTRAINT "platform_model_provider_credential_models_credential_id_fk" FOREIGN KEY ("platform_model_provider_credential_id") REFERENCES "public"."platform_model_provider_credentials"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_model_provider_credentials_default_uidx" ON "platform_model_provider_credentials" USING btree ("is_default") WHERE "platform_model_provider_credentials"."is_default";
--> statement-breakpoint
CREATE INDEX "platform_model_provider_credentials_model_provider_idx" ON "platform_model_provider_credentials" USING btree ("model_provider");
--> statement-breakpoint
CREATE INDEX "platform_model_provider_credentials_status_idx" ON "platform_model_provider_credentials" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_model_provider_credential_models_default_uidx" ON "platform_model_provider_credential_models" USING btree ("platform_model_provider_credential_id") WHERE "platform_model_provider_credential_models"."is_default";
--> statement-breakpoint
CREATE INDEX "platform_model_provider_credential_models_credential_idx" ON "platform_model_provider_credential_models" USING btree ("platform_model_provider_credential_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_model_provider_credential_models_credential_model_uidx" ON "platform_model_provider_credential_models" USING btree ("platform_model_provider_credential_id","model_id");
--> statement-breakpoint
ALTER TABLE "platform_model_provider_credentials" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform_model_provider_credential_models" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "platform_model_provider_credentials_runtime_access_policy"
ON "platform_model_provider_credentials"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "platform_model_provider_credential_models_runtime_access_policy"
ON "platform_model_provider_credential_models"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);
