import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Protects the company subscription foundation used by plan-derived entitlements from losing its
 * constrained plan/status values or company-scoped runtime access policy.
 */
class CompanySubscriptionsMigrationTest {
  static readMigration(): string {
    return readFileSync(
      new URL("../drizzle/0120_company_subscriptions.sql", import.meta.url),
      "utf8",
    );
  }
}

test("company subscriptions migration creates constrained subscription state", () => {
  const migration = CompanySubscriptionsMigrationTest.readMigration();

  assert.match(migration, /CREATE TYPE "public"."company_subscription_plan" AS ENUM\('free', 'starter', 'team', 'enterprise'\)/u);
  assert.match(migration, /CREATE TYPE "public"."company_subscription_status" AS ENUM\('trialing', 'active', 'past_due', 'canceled'\)/u);
  assert.match(migration, /CREATE TABLE "company_subscriptions"/u);
  assert.match(migration, /"company_id" uuid PRIMARY KEY NOT NULL/u);
  assert.match(migration, /"plan" "company_subscription_plan" NOT NULL/u);
  assert.match(migration, /"status" "company_subscription_status" NOT NULL/u);
  assert.match(migration, /REFERENCES "public"."companies"\("id"\) ON DELETE cascade/u);
});

test("company subscriptions migration protects rows with company-scoped RLS", () => {
  const migration = CompanySubscriptionsMigrationTest.readMigration();

  assert.match(migration, /ALTER TABLE "company_subscriptions" ENABLE ROW LEVEL SECURITY/u);
  assert.match(migration, /CREATE POLICY "company_subscriptions_company_scope_policy"/u);
  assert.match(
    migration,
    /ON "company_subscriptions"[\s\S]*FOR ALL[\s\S]*TO public[\s\S]*"company_id" = current_setting\('app\.current_company_id', true\)::uuid/u,
  );
});
