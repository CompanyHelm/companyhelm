import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Protects the routine cron trigger table from drifting between the Drizzle TypeScript schema and
 * SQL migrations. The create routine modal inserts through Drizzle, so nullable columns present in
 * the schema still appear in generated insert SQL as DEFAULT unless a migration creates them.
 */
class RoutineCronTriggerMigrationTest {
  static readRepairMigration(): string {
    return readFileSync(
      new URL("../drizzle/0101_routine_cron_trigger_schedule_bounds.sql", import.meta.url),
      "utf8",
    );
  }
}

test("routine cron trigger migration creates nullable schedule bound columns used by Drizzle inserts", () => {
  const migration = RoutineCronTriggerMigrationTest.readRepairMigration();

  assert.match(
    migration,
    /ALTER TABLE "routine_cron_triggers" ADD COLUMN IF NOT EXISTS "start_at" timestamp with time zone/u,
  );
  assert.match(
    migration,
    /ALTER TABLE "routine_cron_triggers" ADD COLUMN IF NOT EXISTS "end_at" timestamp with time zone/u,
  );
  assert.match(
    migration,
    /ALTER TABLE "routine_cron_triggers" ADD COLUMN IF NOT EXISTS "limit" integer/u,
  );
});
