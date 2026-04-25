ALTER TYPE "public"."session_message_principal_type" ADD VALUE 'github_webhook';--> statement-breakpoint
CREATE TYPE "public"."github_pull_request_state" AS ENUM('open', 'closed', 'merged');--> statement-breakpoint
CREATE TABLE "github_pull_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"github_repository_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"number" integer NOT NULL,
	"url" text NOT NULL,
	"state" "github_pull_request_state" NOT NULL,
	"title" text NOT NULL,
	"owner_session_id" uuid,
	"owner_agent_id" uuid,
	"created_by_session_id" uuid,
	"created_by_agent_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "github_pull_requests_owner_check" CHECK (("github_pull_requests"."owner_session_id" IS NOT NULL AND "github_pull_requests"."owner_agent_id" IS NULL) OR ("github_pull_requests"."owner_session_id" IS NULL AND "github_pull_requests"."owner_agent_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD CONSTRAINT "github_pull_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD CONSTRAINT "github_pull_requests_github_repository_id_github_repositories_id_fk" FOREIGN KEY ("github_repository_id") REFERENCES "public"."github_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD CONSTRAINT "github_pull_requests_owner_session_id_agent_sessions_id_fk" FOREIGN KEY ("owner_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD CONSTRAINT "github_pull_requests_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD CONSTRAINT "github_pull_requests_created_by_session_id_agent_sessions_id_fk" FOREIGN KEY ("created_by_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD CONSTRAINT "github_pull_requests_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_pull_requests_company_owner_agent_id_idx" ON "github_pull_requests" USING btree ("company_id","owner_agent_id");--> statement-breakpoint
CREATE INDEX "github_pull_requests_company_owner_session_id_idx" ON "github_pull_requests" USING btree ("company_id","owner_session_id");--> statement-breakpoint
CREATE INDEX "github_pull_requests_repository_number_idx" ON "github_pull_requests" USING btree ("github_repository_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "github_pull_requests_company_external_id_uidx" ON "github_pull_requests" USING btree ("company_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_pull_requests_company_repository_number_uidx" ON "github_pull_requests" USING btree ("company_id","github_repository_id","number");--> statement-breakpoint
ALTER TABLE "github_pull_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "github_pull_requests_company_scope_policy"
ON "github_pull_requests"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
