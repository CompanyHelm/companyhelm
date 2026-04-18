import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Guards the session-scoped artifact migration against Postgres rejecting the check constraint
 * while Drizzle runs pending migrations inside a single transaction. Newly added enum labels cannot
 * be used as enum literals until the transaction that added them commits.
 */
test("artifact scope migration does not use the new session enum label directly in its check constraint", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0098_public_hardball.sql", import.meta.url),
    "utf8",
  );

  assert.match(migrationSql, /ALTER TYPE "public"\."artifact_scope" ADD VALUE 'session';/u);
  assert.match(migrationSql, /\("artifacts"\."scope_type"\)::text = 'session'/u);
  assert.doesNotMatch(migrationSql, /"artifacts"\."scope_type" = 'session'/u);
});
