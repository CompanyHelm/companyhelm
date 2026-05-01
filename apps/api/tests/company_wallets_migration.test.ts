import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Guards the wallet ledger migration because balance enforcement depends on signed transactions,
 * subscription-period idempotency, and company-scoped RLS being present from the first deploy.
 */
class CompanyWalletsMigrationTest {
  static readMigration(): string {
    return readFileSync(
      new URL("../drizzle/0157_company_wallets.sql", import.meta.url),
      "utf8",
    );
  }
}

test("company wallet migration adds wallets, transactions, pending plans, and idempotency", () => {
  const migration = CompanyWalletsMigrationTest.readMigration();

  assert.match(migration, /CREATE TYPE "public"\."wallet_type" AS ENUM\('subscription', 'pay_as_you_go'\)/u);
  assert.match(migration, /CREATE TYPE "public"\."wallet_transaction_category" AS ENUM\('llm_charge', 'monthly_recharge', 'adjustment', 'opening'\)/u);
  assert.match(migration, /ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "pending_plan" "company_subscription_plan"/u);
  assert.match(migration, /ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "pending_plan_effective_at" timestamp with time zone/u);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "wallets"/u);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "wallet_transactions"/u);
  assert.match(migration, /"wallet_transactions_amount_sign_check"/u);
  assert.match(migration, /wallet_transactions_monthly_recharge_period_uidx/u);
  assert.match(migration, /wallet_transactions_opening_uidx/u);
  assert.match(migration, /wallet_transactions_llm_charge_turn_uidx/u);
  assert.match(migration, /ALTER TABLE "wallets" ENABLE ROW LEVEL SECURITY/u);
  assert.match(migration, /CREATE POLICY "wallets_company_scope_policy"/u);
  assert.match(migration, /ALTER TABLE "wallet_transactions" ENABLE ROW LEVEL SECURITY/u);
  assert.match(migration, /CREATE POLICY "wallet_transactions_company_scope_policy"/u);
  assert.match(migration, /INSERT INTO "wallets"/u);
  assert.match(migration, /INSERT INTO "wallet_transactions"/u);
});
