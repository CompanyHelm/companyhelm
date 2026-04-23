import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Captures the legacy-company onboarding backfill so existing tenants do not get routed into the
 * new onboarding flow simply because their onboarding row was created before the product changed.
 */
class ExistingCompanyOnboardingsCompletedMigrationTest {
  static readMigration(): string {
    return readFileSync(
      new URL("../drizzle/0127_existing_company_onboardings_completed.sql", import.meta.url),
      "utf8",
    );
  }
}

test("existing company onboarding migration marks every company as completed", () => {
  const migration = ExistingCompanyOnboardingsCompletedMigrationTest.readMigration();

  assert.match(
    migration,
    /INSERT INTO "company_onboardings" \("company_id", "status", "completed_at", "created_at", "updated_at"\)/u,
  );
  assert.match(
    migration,
    /SELECT "companies"\."id", 'completed', now\(\), now\(\), now\(\)\s+FROM "companies"/u,
  );
  assert.match(migration, /ON CONFLICT \("company_id"\) DO UPDATE/u);
  assert.match(migration, /"status" = 'completed'/u);
  assert.match(
    migration,
    /"completed_at" = COALESCE\("company_onboardings"\."completed_at", EXCLUDED\."completed_at"\)/u,
  );
});
