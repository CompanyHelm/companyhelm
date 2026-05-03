DROP INDEX IF EXISTS "companies_clerk_organization_id_uidx";--> statement-breakpoint
DROP INDEX IF EXISTS "users_clerk_user_id_uidx";--> statement-breakpoint
DROP INDEX IF EXISTS "company_members_clerk_invitation_id_uidx";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN IF EXISTS "clerk_organization_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "clerk_user_id";--> statement-breakpoint
ALTER TABLE "company_members" DROP COLUMN IF EXISTS "clerk_invitation_id";--> statement-breakpoint
ALTER TABLE "company_deletion_requests" DROP COLUMN IF EXISTS "clerk_organization_id";
