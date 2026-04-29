CREATE TYPE "public"."company_member_role" AS ENUM('admin', 'member');
--> statement-breakpoint
CREATE TYPE "public"."company_member_status" AS ENUM('active', 'invited');
--> statement-breakpoint
ALTER TABLE "company_members" ADD COLUMN "role" "company_member_role" DEFAULT 'admin' NOT NULL;
--> statement-breakpoint
ALTER TABLE "company_members" ADD COLUMN "status" "company_member_status" DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "company_members" ADD COLUMN "clerk_invitation_id" text;
--> statement-breakpoint
ALTER TABLE "company_members" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "company_members" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "company_members_clerk_invitation_id_uidx" ON "company_members" USING btree ("clerk_invitation_id");
--> statement-breakpoint
ALTER TABLE "company_members" ALTER COLUMN "role" SET DEFAULT 'member';
