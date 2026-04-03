CREATE TABLE "company_settings" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"base_system_prompt" text
);
--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;