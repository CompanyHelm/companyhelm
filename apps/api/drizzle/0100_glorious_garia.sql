ALTER TABLE "tasks" DROP CONSTRAINT "tasks_task_stage_id_task_stages_id_fk";
--> statement-breakpoint
ALTER TABLE "task_stages" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "task_stages"
SET "is_default" = false;--> statement-breakpoint
UPDATE "task_stages"
SET "is_default" = true
WHERE lower("name") = 'backlog';--> statement-breakpoint
INSERT INTO "task_stages" ("id", "company_id", "name", "is_default", "created_at", "updated_at")
SELECT md5("companies"."id"::text || ':backlog')::uuid, "companies"."id", 'Backlog', true, now(), now()
FROM "companies"
WHERE NOT EXISTS (
  SELECT 1
  FROM "task_stages"
  WHERE "task_stages"."company_id" = "companies"."id"
    AND lower("task_stages"."name") = 'backlog'
);--> statement-breakpoint
UPDATE "tasks"
SET "task_stage_id" = "task_stages"."id"
FROM "task_stages"
WHERE "tasks"."company_id" = "task_stages"."company_id"
  AND "task_stages"."is_default"
  AND "tasks"."task_stage_id" IS NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "task_stage_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_task_stage_id_task_stages_id_fk" FOREIGN KEY ("task_stage_id") REFERENCES "public"."task_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_stages_company_default_uidx" ON "task_stages" USING btree ("company_id") WHERE "task_stages"."is_default";
