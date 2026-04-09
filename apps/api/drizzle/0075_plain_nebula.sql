CREATE TABLE "skill_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"instructions" text,
	"file_list" text[] NOT NULL,
	"skill_group_id" uuid,
	"repository" text,
	"skill_directory" text
);
--> statement-breakpoint
ALTER TABLE "skill_groups" ADD CONSTRAINT "skill_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_skill_group_id_skill_groups_id_fk" FOREIGN KEY ("skill_group_id") REFERENCES "public"."skill_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skill_groups_company_id_idx" ON "skill_groups" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "skills_skill_group_id_idx" ON "skills" USING btree ("skill_group_id");--> statement-breakpoint
CREATE INDEX "skills_company_id_idx" ON "skills" USING btree ("company_id");--> statement-breakpoint
