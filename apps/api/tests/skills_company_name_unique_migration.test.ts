import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("skills company-name unique migration removes the global skill name constraint", () => {
  const migration = readFileSync(
    new URL("../drizzle/0093_skills_company_name_unique.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /DROP INDEX IF EXISTS "skills_name_uidx";/u);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS "skills_company_id_name_uidx"\s+ON "skills" USING btree \("company_id","name"\);/u,
  );
});
