ALTER TABLE "companies" DROP COLUMN IF EXISTS "deletion_requested_at";
--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN IF EXISTS "deletion_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."company_deletion_status";
