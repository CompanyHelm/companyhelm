CREATE TABLE "company_github_installations" (
  "installation_id" bigint PRIMARY KEY NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "company_github_installations_company_id_idx"
  ON "company_github_installations" USING btree ("company_id");
--> statement-breakpoint
CREATE TABLE "github_repositories" (
  "id" uuid PRIMARY KEY NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "installation_id" bigint NOT NULL REFERENCES "company_github_installations"("installation_id") ON DELETE cascade,
  "external_id" text NOT NULL,
  "name" text NOT NULL,
  "full_name" text NOT NULL,
  "html_url" text,
  "is_private" boolean NOT NULL,
  "default_branch" text,
  "archived" boolean NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "github_repositories_company_id_idx"
  ON "github_repositories" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "github_repositories_installation_id_idx"
  ON "github_repositories" USING btree ("installation_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "github_repositories_company_installation_external_uidx"
  ON "github_repositories" USING btree ("company_id", "installation_id", "external_id");
--> statement-breakpoint
ALTER TABLE "company_github_installations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "github_repositories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "company_github_installations_company_scope_policy"
ON "company_github_installations"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "github_repositories_company_scope_policy"
ON "github_repositories"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
