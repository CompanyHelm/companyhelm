CREATE TABLE "local_auth_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"password_salt" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_auth_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "slug" text;
--> statement-breakpoint
ALTER TABLE "local_auth_credentials" ADD CONSTRAINT "local_auth_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "local_auth_sessions" ADD CONSTRAINT "local_auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "local_auth_sessions" ADD CONSTRAINT "local_auth_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_uidx" ON "companies" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "local_auth_sessions_company_id_idx" ON "local_auth_sessions" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "local_auth_sessions_user_id_idx" ON "local_auth_sessions" USING btree ("user_id");
