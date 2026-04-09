import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type MigrationJournalEntry = {
  tag: string;
};

type MigrationJournalDocument = {
  entries: MigrationJournalEntry[];
};

/**
 * Verifies that every checked-in migration SQL file is registered in Drizzle's journal before the
 * bootstrap migrator runs. This catches silent drift where a new SQL file exists in git but can
 * never be applied because the journal was not updated.
 */
export class MigrationJournalAuditor {
  private readonly migrationsFolderPath: string;

  constructor(migrationsFolderPath: string) {
    this.migrationsFolderPath = migrationsFolderPath;
  }

  assertSynchronized(): void {
    const journalTags = new Set(this.readJournalTags());
    const sqlTags = this.readSqlTags();
    const missingTags = sqlTags.filter((sqlTag) => !journalTags.has(sqlTag));

    if (missingTags.length === 0) {
      return;
    }

    throw new Error(
      `Drizzle migration journal is missing entries for: ${missingTags.join(", ")}.`,
    );
  }

  private readJournalTags(): string[] {
    const journalPath = join(this.migrationsFolderPath, "meta", "_journal.json");
    const journalDocument = JSON.parse(readFileSync(journalPath, "utf8")) as MigrationJournalDocument;

    return journalDocument.entries.map((entry) => entry.tag);
  }

  private readSqlTags(): string[] {
    return readdirSync(this.migrationsFolderPath)
      .filter((fileName) => fileName.endsWith(".sql"))
      .map((fileName) => fileName.replace(/\.sql$/, ""))
      .sort();
  }
}
