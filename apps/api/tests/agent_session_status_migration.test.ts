import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "vitest";

/**
 * Guards the agent-session status migration against adding a non-null enum column before existing
 * rows are backfilled, which would break bootstrap on any database that already has sessions.
 */
test("agent session status migration backfills existing rows before enforcing not-null", async () => {
  const migrationPath = resolve(process.cwd(), "drizzle/0022_young_master_chief.sql");
  const migrationSql = await readFile(migrationPath, "utf8");

  const addColumnIndex = migrationSql.indexOf('ALTER TABLE "agent_sessions" ADD COLUMN "status" "agent_session_status";');
  const backfillIndex = migrationSql.indexOf("UPDATE \"agent_sessions\"");
  const notNullIndex = migrationSql.indexOf('ALTER TABLE "agent_sessions" ALTER COLUMN "status" SET NOT NULL;');
  const dropColumnIndex = migrationSql.indexOf('ALTER TABLE "agent_sessions" DROP COLUMN "is_running";');

  assert.notEqual(addColumnIndex, -1);
  assert.notEqual(backfillIndex, -1);
  assert.notEqual(notNullIndex, -1);
  assert.notEqual(dropColumnIndex, -1);
  assert.equal(
    migrationSql.includes('ALTER TABLE "agent_sessions" ADD COLUMN "status" "agent_session_status" NOT NULL;'),
    false,
  );
  assert.equal(addColumnIndex < backfillIndex, true);
  assert.equal(backfillIndex < notNullIndex, true);
  assert.equal(notNullIndex < dropColumnIndex, true);
  assert.match(migrationSql, /WHEN "is_running" THEN 'running'/);
  assert.match(migrationSql, /ELSE 'stopped'/);
});
