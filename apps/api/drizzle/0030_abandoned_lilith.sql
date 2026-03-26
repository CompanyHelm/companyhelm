CREATE TYPE "public"."task_status" AS ENUM('draft', 'pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "task_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"task_category_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_categories" ADD CONSTRAINT "task_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_task_category_id_task_categories_id_fk" FOREIGN KEY ("task_category_id") REFERENCES "public"."task_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_categories_company_id_idx" ON "task_categories" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "task_categories_company_created_at_idx" ON "task_categories" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_categories_company_id_name_lower_uidx" ON "task_categories" USING btree ("company_id",lower("name"));--> statement-breakpoint
CREATE INDEX "tasks_company_id_idx" ON "tasks" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "tasks_company_task_category_id_idx" ON "tasks" USING btree ("company_id","task_category_id");--> statement-breakpoint
CREATE INDEX "tasks_company_status_created_at_idx" ON "tasks" USING btree ("company_id","status","created_at");