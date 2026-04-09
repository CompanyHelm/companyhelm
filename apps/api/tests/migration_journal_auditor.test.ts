import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { MigrationJournalAuditor } from "../src/db/bootstrap/modules/migration_journal_auditor.ts";
import { MigrationBootstrapModule } from "../src/db/bootstrap/modules/migration.ts";

/**
 * Exercises the migration journal guard against the specific failure mode where a checked-in SQL
 * file exists but bootstrap never runs it because the Drizzle journal omitted the tag.
 */
describe("MigrationJournalAuditor", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("accepts the checked-in migrations folder when every SQL file is journaled", () => {
    const auditor = new MigrationJournalAuditor(MigrationBootstrapModule.getMigrationsFolderPath());

    expect(() => auditor.assertSynchronized()).not.toThrow();
  });

  it("throws when a migration SQL file is missing from the journal", () => {
    const migrationsFolder = mkdtempSync(join(tmpdir(), "companyhelm-migrations-"));
    temporaryDirectories.push(migrationsFolder);

    mkdirSync(join(migrationsFolder, "meta"), { recursive: true });
    writeFileSync(join(migrationsFolder, "0001_initial.sql"), "select 1;");
    writeFileSync(
      join(migrationsFolder, "meta", "_journal.json"),
      JSON.stringify({
        entries: [],
      }),
    );

    const auditor = new MigrationJournalAuditor(migrationsFolder);

    expect(() => auditor.assertSynchronized()).toThrowError(
      "Drizzle migration journal is missing entries for: 0001_initial.",
    );
  });
});
