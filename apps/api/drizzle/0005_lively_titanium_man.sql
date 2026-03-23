ALTER TABLE "companies" ADD COLUMN "clerk_organization_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_clerk_organization_id_uidx" ON "companies" USING btree ("clerk_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_uidx" ON "users" USING btree ("clerk_user_id");
