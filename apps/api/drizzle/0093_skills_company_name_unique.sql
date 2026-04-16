DROP INDEX IF EXISTS "skills_name_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "skills_company_id_name_uidx"
  ON "skills" USING btree ("company_id","name");
