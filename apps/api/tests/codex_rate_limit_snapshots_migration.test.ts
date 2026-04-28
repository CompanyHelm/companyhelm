import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { MigrationBootstrapModule } from "../src/db/bootstrap/modules/migration.ts";

/**
 * Guards the Codex rate-limit storage split so company snapshots remain tenant-scoped while
 * operator-owned platform credential snapshots stay in their own table.
 */
class CodexRateLimitSnapshotsMigrationTest {
  static readMigration(): string {
    return readFileSync(
      join(MigrationBootstrapModule.getMigrationsFolderPath(), "0141_premium_mephistopheles.sql"),
      "utf8",
    );
  }
}

test("Codex rate-limit snapshots are split into company and platform credential tables", () => {
  const migration = CodexRateLimitSnapshotsMigrationTest.readMigration();

  expect(migration).toMatch(/CREATE TABLE "platform_codex_rate_limit_snapshots"/);
  expect(migration).toMatch(/"platform_model_provider_credential_id" uuid NOT NULL/);
  expect(migration).toMatch(/ALTER TABLE "codex_rate_limit_snapshots" ADD COLUMN "company_id" uuid NOT NULL/);
  expect(migration).toMatch(
    /CREATE UNIQUE INDEX "codex_rate_limit_snapshots_credential_limit_uidx"[\s\S]*"company_id","credential_id","limit_id"/,
  );
  expect(migration).toMatch(
    /ON "codex_rate_limit_snapshots"[\s\S]*USING \("company_id" = current_setting\('app\.current_company_id', true\)::uuid\)[\s\S]*WITH CHECK \("company_id" = current_setting\('app\.current_company_id', true\)::uuid\);/,
  );
  expect(migration).toMatch(/DROP TYPE "public"\."codex_rate_limit_credential_source"/);
});
