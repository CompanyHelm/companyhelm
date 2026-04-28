CREATE TABLE "company_model_provider_defaults" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"model_credential_source" "model_credential_source" NOT NULL,
	"model_provider_credential_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "company_model_provider_defaults_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "company_model_provider_defaults_credential_fk" FOREIGN KEY ("model_provider_credential_id") REFERENCES "public"."model_provider_credentials"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "company_model_provider_defaults_source_check" CHECK ((
      ("model_credential_source" = 'platform' AND "model_provider_credential_id" IS NULL)
      OR
      ("model_credential_source" = 'user_provided' AND "model_provider_credential_id" IS NOT NULL)
    ))
);
--> statement-breakpoint
CREATE INDEX "company_model_provider_defaults_credential_idx" ON "company_model_provider_defaults" USING btree ("model_provider_credential_id");
--> statement-breakpoint
INSERT INTO "company_model_provider_defaults" (
	"company_id",
	"model_credential_source",
	"model_provider_credential_id",
	"created_at",
	"updated_at"
)
SELECT
	"companies"."id",
	CASE
		WHEN "default_credentials"."id" IS NULL THEN 'platform'::"model_credential_source"
		ELSE 'user_provided'::"model_credential_source"
	END,
	"default_credentials"."id",
	now(),
	now()
FROM "companies"
LEFT JOIN LATERAL (
	SELECT "model_provider_credentials"."id"
	FROM "model_provider_credentials"
	WHERE
		"model_provider_credentials"."company_id" = "companies"."id"
		AND "model_provider_credentials"."is_default" = true
	LIMIT 1
  ) "default_credentials" ON true
ON CONFLICT ("company_id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "company_model_provider_defaults" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "company_model_provider_defaults_company_scope_policy"
ON "company_model_provider_defaults"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
DROP INDEX IF EXISTS "model_provider_credentials_company_default_uidx";
--> statement-breakpoint
ALTER TABLE "model_provider_credentials" DROP COLUMN "is_default";
