ALTER TABLE "model_provider_credentials" ADD COLUMN "is_managed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "model_provider_credentials_company_managed_uidx" ON "model_provider_credentials" USING btree ("company_id") WHERE "model_provider_credentials"."is_managed";
