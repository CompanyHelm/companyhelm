import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Guards the post-signup wallet repair migration so companies created while Clerk bootstrap ran
 * before company RLS context was bound receive the same subscription wallet ledger as new signups.
 */
class CompanyWalletBackfillMigrationTest {
  static readMigration(): string {
    return readFileSync(
      new URL("../drizzle/0161_repair_missing_company_wallets.sql", import.meta.url),
      "utf8",
    );
  }
}

test("missing company wallet repair migration backfills subscription wallets and opening transactions", () => {
  const migration = CompanyWalletBackfillMigrationTest.readMigration();

  assert.match(migration, /missing_company_wallets AS/u);
  assert.match(migration, /WHERE NOT EXISTS \(\s+SELECT 1\s+FROM "wallets"[\s\S]*"wallets"\."type" = 'subscription'/u);
  assert.match(migration, /WHEN 'pro' THEN 500000000000/u);
  assert.match(migration, /WHEN 'plus' THEN 50000000000/u);
  assert.match(migration, /ELSE 10000000000/u);
  assert.match(migration, /INSERT INTO "wallets"/u);
  assert.match(migration, /RETURNING "id", "company_id", "amount_nano_usd"/u);
  assert.match(migration, /INSERT INTO "wallet_transactions"/u);
  assert.match(migration, /'opening'/u);
  assert.match(migration, /ON CONFLICT DO NOTHING/u);
});
