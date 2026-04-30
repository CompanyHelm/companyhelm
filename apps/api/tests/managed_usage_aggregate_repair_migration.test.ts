import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Guards the managed-usage repair against rebuilding CompanyHelm included usage from every virtual
 * cost. Only turns with a platform provider credential are allowed into the managed aggregate.
 */
class ManagedUsageAggregateRepairMigrationTest {
  static readMigration(): string {
    return readFileSync("drizzle/0153_repair_managed_llm_usage.sql", "utf8");
  }
}

test("managed usage repair migration rebuilds managed aggregates from platform turns only", () => {
  const migration = ManagedUsageAggregateRepairMigrationTest.readMigration();

  assert.match(
    migration,
    /DELETE FROM "llm_usage_aggregates"\s+WHERE "scope_type" = 'managed_model_provider_credential'/u,
  );
  assert.match(migration, /FROM "session_turns"\s+WHERE "platform_model_provider_credential_id" IS NOT NULL/u);
  assert.match(migration, /AND "usage_recorded_at" IS NOT NULL/u);
  assert.match(migration, /'managed_model_provider_credential'/u);
  assert.match(migration, /'total'::"llm_usage_aggregate_period"/u);
  assert.match(migration, /'day'::"llm_usage_aggregate_period"/u);
  assert.match(migration, /'month'::"llm_usage_aggregate_period"/u);
});
