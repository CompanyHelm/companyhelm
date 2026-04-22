import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Protects the company plan foundation used by plan-derived entitlements from drifting back into a
 * separate subscription table or from adding a non-null column without backfilling existing rows.
 */
class CompanyPlanMigrationTest {
  static readMigration(): string {
    return readFileSync(
      new URL("../drizzle/0121_light_wither.sql", import.meta.url),
      "utf8",
    );
  }
}

test("company plan migration stores free and pro plans directly on companies", () => {
  const migration = CompanyPlanMigrationTest.readMigration();

  assert.match(migration, /CREATE TYPE "public"."company_subscription_plan" AS ENUM\('free', 'pro'\)/u);
  assert.match(migration, /ALTER TABLE "companies" ADD COLUMN "plan" "company_subscription_plan"/u);
  assert.match(migration, /UPDATE "companies" SET "plan" = 'free' WHERE "plan" IS NULL/u);
  assert.match(migration, /ALTER TABLE "companies" ALTER COLUMN "plan" SET NOT NULL/u);
  assert.doesNotMatch(migration, /company_subscriptions/u);
});
