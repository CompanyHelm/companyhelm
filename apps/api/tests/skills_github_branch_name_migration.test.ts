import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("skills migration adds the github_branch_name column", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0088_skills_github_branch_name.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migrationSql,
    /ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "github_branch_name" text;/,
  );
});
