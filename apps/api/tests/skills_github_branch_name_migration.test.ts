import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("skills migration renames generic Git source columns and backfills public sources", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0116_sparkling_dagger.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migrationSql,
    /ALTER TABLE "skills" RENAME COLUMN "github_branch_name" TO "branch_name";/,
  );
  assert.match(
    migrationSql,
    /ALTER TABLE "skills" RENAME COLUMN "github_tracked_commit_sha" TO "tracked_commit_sha";/,
  );
  assert.match(
    migrationSql,
    /SET "source_type" = 'public_git'/,
  );
});
