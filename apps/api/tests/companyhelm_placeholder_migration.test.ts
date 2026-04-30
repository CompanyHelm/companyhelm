import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "vitest";

const DRIZZLE_DIRECTORY = path.resolve(import.meta.dirname, "../drizzle");
const PLACEHOLDER_VALUE = "companyhelm-managed-openai-api-key";
const PLACEHOLDER_PREFIX = "companyhelm-managed-%";

test("migrations remove the CompanyHelm placeholder credential value after it is introduced", () => {
  const migrationFiles = readdirSync(DRIZZLE_DIRECTORY)
    .filter((fileName) => /^\d+_.*\.sql$/.test(fileName))
    .sort();
  const placeholderMigrationIndex = migrationFiles.findIndex((fileName) => {
    const migration = readFileSync(path.join(DRIZZLE_DIRECTORY, fileName), "utf8");
    return migration.includes(PLACEHOLDER_VALUE);
  });

  assert.notEqual(placeholderMigrationIndex, -1, "expected to locate the migration that introduced placeholder credentials");

  const repairMigrations = migrationFiles.slice(placeholderMigrationIndex + 1).filter((fileName) => {
    const migration = readFileSync(path.join(DRIZZLE_DIRECTORY, fileName), "utf8");
    return migration.includes(PLACEHOLDER_PREFIX)
      && migration.includes('UPDATE "platform_model_provider_credentials"')
      && migration.includes('"encrypted_api_key" = \'\'')
      && migration.includes('"status" = \'error\'');
  });

  assert.ok(
    repairMigrations.length > 0,
    "expected a later migration to clear and error placeholder platform credentials",
  );
});
