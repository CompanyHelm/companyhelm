CREATE TYPE "public"."company_deletion_request_status" AS ENUM('requested', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."company_deletion_status" AS ENUM('active', 'deletion_requested');--> statement-breakpoint
CREATE TABLE "company_deletion_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"clerk_organization_id" text,
	"company_name" text NOT NULL,
	"requested_by_user_id" uuid,
	"status" "company_deletion_request_status" DEFAULT 'requested' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"requested_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "deletion_status" "company_deletion_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "company_deletion_requests" ADD CONSTRAINT "company_deletion_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_deletion_requests_company_id_idx" ON "company_deletion_requests" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_deletion_requests_status_next_attempt_idx" ON "company_deletion_requests" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_deletion_requests_company_open_uidx" ON "company_deletion_requests" USING btree ("company_id") WHERE "company_deletion_requests"."status" IN ('requested', 'processing', 'failed');