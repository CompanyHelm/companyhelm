CREATE TABLE "github_repository_provisionings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"github_repository_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_repository_provisionings" ADD CONSTRAINT "github_repository_provisionings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repository_provisionings" ADD CONSTRAINT "github_repository_provisionings_github_repository_id_github_repositories_id_fk" FOREIGN KEY ("github_repository_id") REFERENCES "public"."github_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_repository_provisionings_company_id_idx" ON "github_repository_provisionings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "github_repository_provisionings_repository_id_idx" ON "github_repository_provisionings" USING btree ("github_repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_repository_provisionings_company_repository_uidx" ON "github_repository_provisionings" USING btree ("company_id","github_repository_id");--> statement-breakpoint
ALTER TABLE "github_repository_provisionings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "github_repository_provisionings_company_scope_policy"
ON "github_repository_provisionings"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
