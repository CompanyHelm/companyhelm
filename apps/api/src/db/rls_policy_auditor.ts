import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

export type RlsPolicyAuditReport = {
  rlsEnabledTables: string[];
  policyTables: string[];
  missingPolicyTables: string[];
};

/**
 * Audits SQL migrations for row-level security coverage so tables that enable RLS cannot silently
 * ship without any matching policy definitions. Its scope is static migration analysis; it does not
 * connect to a database.
 */
export class RlsPolicyAuditor {
  audit(migrationsDirectoryPath: string): RlsPolicyAuditReport {
    const migrationFileContents = readdirSync(migrationsDirectoryPath)
      .filter((fileName) => extname(fileName) === ".sql")
      .sort()
      .map((fileName) => readFileSync(join(migrationsDirectoryPath, fileName), "utf8"));
    const rlsEnabledTables = new Set<string>();
    const policyTables = new Set<string>();

    for (const fileContents of migrationFileContents) {
      for (const match of fileContents.matchAll(/ALTER TABLE "([^"]+)" ENABLE ROW LEVEL SECURITY;/g)) {
        rlsEnabledTables.add(match[1]!);
      }

      for (const match of fileContents.matchAll(/CREATE POLICY "[^"]+"\s+ON "([^"]+)"/g)) {
        policyTables.add(match[1]!);
      }
    }

    const missingPolicyTables = [...rlsEnabledTables].filter((tableName) => !policyTables.has(tableName)).sort();
    return {
      rlsEnabledTables: [...rlsEnabledTables].sort(),
      policyTables: [...policyTables].sort(),
      missingPolicyTables,
    };
  }
}
