ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "tasks"
SET "completed_at" = "updated_at"
WHERE "status" = 'completed' AND "completed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "tasks_company_status_completed_at_idx" ON "tasks" USING btree ("company_id","status","completed_at");
