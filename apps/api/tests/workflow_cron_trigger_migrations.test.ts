import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Protects workflow cron trigger persistence from drifting between the Drizzle schema and SQL
 * migrations. Scheduled workflows rely on trigger rows, cron rows, input values, and RLS policies.
 */
class WorkflowCronTriggerMigrationTest {
  static readMigration(): string {
    return readFileSync(
      new URL("../drizzle/0112_modern_black_bolt.sql", import.meta.url),
      "utf8",
    );
  }
}

test("workflow cron trigger migration creates trigger tables and run linkage", () => {
  const migration = WorkflowCronTriggerMigrationTest.readMigration();

  assert.match(migration, /CREATE TABLE "workflow_triggers"/u);
  assert.match(migration, /CREATE TABLE "workflow_cron_triggers"/u);
  assert.match(migration, /CREATE TABLE "workflow_trigger_input_values"/u);
  assert.match(migration, /ALTER TABLE "workflow_runs" ADD COLUMN "trigger_id" uuid/u);
  assert.match(migration, /ALTER TABLE "workflow_runs" ADD COLUMN "source" "workflow_run_source" DEFAULT 'manual' NOT NULL/u);
});

test("workflow cron trigger migration protects new company-scoped tables with RLS", () => {
  const migration = WorkflowCronTriggerMigrationTest.readMigration();

  assert.match(migration, /ALTER TABLE "workflow_triggers" ENABLE ROW LEVEL SECURITY/u);
  assert.match(migration, /CREATE POLICY "workflow_triggers_company_scope_policy"/u);
  assert.match(migration, /ALTER TABLE "workflow_cron_triggers" ENABLE ROW LEVEL SECURITY/u);
  assert.match(migration, /CREATE POLICY "workflow_cron_triggers_company_scope_policy"/u);
  assert.match(migration, /ALTER TABLE "workflow_trigger_input_values" ENABLE ROW LEVEL SECURITY/u);
  assert.match(migration, /CREATE POLICY "workflow_trigger_input_values_company_scope_policy"/u);
});
