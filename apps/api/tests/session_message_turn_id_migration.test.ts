import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("session message turn id migration backfills existing rows before enforcing not null", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0056_gigantic_switch.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migrationSql,
    /ALTER TABLE "session_messages" ADD COLUMN IF NOT EXISTS "turn_id" uuid;/,
  );
  assert.match(
    migrationSql,
    /UPDATE "session_messages"\s+SET "turn_id" = "id"\s+WHERE "turn_id" IS NULL;/,
  );
  assert.match(
    migrationSql,
    /ALTER TABLE "session_messages" ALTER COLUMN "turn_id" SET NOT NULL;/,
  );
  assert.doesNotMatch(
    migrationSql,
    /ALTER TABLE "session_messages" ADD COLUMN "turn_id" uuid NOT NULL;/,
  );
});
