CREATE TABLE "company_github_installations" (
	"installation_id" bigint PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_repositories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"installation_id" bigint NOT NULL,
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
ALTER TABLE "agent_sessions" ADD COLUMN "context_messages" jsonb;--> statement-breakpoint
ALTER TABLE "company_github_installations" ADD CONSTRAINT "company_github_installations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_installation_id_company_github_installations_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."company_github_installations"("installation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_github_installations_company_id_idx" ON "company_github_installations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "github_repositories_company_id_idx" ON "github_repositories" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "github_repositories_installation_id_idx" ON "github_repositories" USING btree ("installation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_repositories_company_installation_external_uidx" ON "github_repositories" USING btree ("company_id","installation_id","external_id");