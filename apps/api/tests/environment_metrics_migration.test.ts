import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "vitest";
import { MigrationBootstrapModule } from "../src/db/bootstrap/modules/migration.ts";

class EnvironmentMetricsMigrationTest {
  static readMigration(): string {
    return readFileSync(
      join(MigrationBootstrapModule.getMigrationsFolderPath(), "0156_environment_metrics.sql"),
      "utf8",
    );
  }
}

test("environment metrics migration adds latest snapshot columns and tenant-scoped history", () => {
  const migration = EnvironmentMetricsMigrationTest.readMigration();

  assert.match(migration, /ALTER TABLE "agent_environments" ADD COLUMN "metrics_sampled_at" timestamp with time zone;/u);
  assert.match(migration, /ALTER TABLE "agent_environments" ADD COLUMN "cpu_used_pct" double precision;/u);
  assert.match(migration, /ALTER TABLE "agent_environments" ADD COLUMN "mem_used_bytes" bigint;/u);
  assert.match(migration, /ALTER TABLE "agent_environments" ADD COLUMN "disk_used_bytes" bigint;/u);
  assert.match(migration, /CREATE TABLE "agent_environment_metric_samples"/u);
  assert.match(migration, /"company_id" uuid NOT NULL/u);
  assert.match(migration, /"environment_id" uuid NOT NULL/u);
  assert.match(migration, /CREATE UNIQUE INDEX "agent_environment_metric_samples_environment_sampled_at_uidx"/u);
  assert.match(migration, /ALTER TABLE "agent_environment_metric_samples" ENABLE ROW LEVEL SECURITY;/u);
  assert.match(
    migration,
    /CREATE POLICY "agent_environment_metric_samples_company_scope_policy"[\s\S]*USING \("company_id" = current_setting\('app\.current_company_id', true\)::uuid\)[\s\S]*WITH CHECK \("company_id" = current_setting\('app\.current_company_id', true\)::uuid\);/u,
  );
});
