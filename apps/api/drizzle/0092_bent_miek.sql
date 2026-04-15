ALTER TABLE "task_categories" RENAME TO "task_stages";--> statement-breakpoint
ALTER TABLE "tasks" RENAME COLUMN "task_category_id" TO "task_stage_id";--> statement-breakpoint
ALTER TABLE "task_stages" DROP CONSTRAINT "task_categories_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_task_category_id_task_categories_id_fk";
--> statement-breakpoint
DROP INDEX "task_categories_company_id_idx";--> statement-breakpoint
DROP INDEX "task_categories_company_created_at_idx";--> statement-breakpoint
DROP INDEX "task_categories_company_id_name_lower_uidx";--> statement-breakpoint
DROP INDEX "tasks_company_task_category_id_idx";--> statement-breakpoint
ALTER TABLE "task_stages" ADD CONSTRAINT "task_stages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_task_stage_id_task_stages_id_fk" FOREIGN KEY ("task_stage_id") REFERENCES "public"."task_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_stages_company_id_idx" ON "task_stages" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "task_stages_company_created_at_idx" ON "task_stages" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_stages_company_id_name_lower_uidx" ON "task_stages" USING btree ("company_id",lower("name"));--> statement-breakpoint
CREATE INDEX "tasks_company_task_stage_id_idx" ON "tasks" USING btree ("company_id","task_stage_id");