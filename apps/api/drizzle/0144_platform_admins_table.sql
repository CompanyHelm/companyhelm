CREATE TABLE "platform_admins" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"granted_by_user_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "platform_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "platform_admins_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
INSERT INTO "platform_admins" ("user_id", "created_at")
SELECT "id", now()
FROM "users"
WHERE "is_platform_admin" = true
ON CONFLICT ("user_id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_platform_admin";
