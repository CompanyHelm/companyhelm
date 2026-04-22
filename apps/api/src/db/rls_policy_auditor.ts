import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

export type RlsPolicyAuditReport = {
  rlsEnabledTables: string[];
  policyTables: string[];
  missingPolicyTables: string[];
  nonPublicPolicyTargets: RlsPolicyTarget[];
};

export type RlsPolicyTarget = {
  migrationFileName: string;
  policyName: string;
  tableName: string;
  target: string;
};

/**
 * Audits SQL migrations for row-level security coverage and role-independent policy targets. The
 * runtime role name comes from config, so migrations must not bake one role spelling into a policy.
 */
export class RlsPolicyAuditor {
  audit(migrationsDirectoryPath: string): RlsPolicyAuditReport {
    const migrationFiles = readdirSync(migrationsDirectoryPath)
      .filter((fileName) => extname(fileName) === ".sql")
      .sort()
      .map((fileName) => ({
        fileContents: readFileSync(join(migrationsDirectoryPath, fileName), "utf8"),
        fileName,
      }));
    const rlsEnabledTables = new Set<string>();
    const policyTables = new Set<string>();
    const nonPublicPolicyTargets: RlsPolicyTarget[] = [];

    for (const migrationFile of migrationFiles) {
      const fileContents = migrationFile.fileContents;
      for (const match of fileContents.matchAll(/ALTER TABLE "([^"]+)" ENABLE ROW LEVEL SECURITY;/g)) {
        rlsEnabledTables.add(match[1]!);
      }

      for (const match of fileContents.matchAll(/CREATE POLICY "[^"]+"\s+ON "([^"]+)"/g)) {
        policyTables.add(match[1]!);
      }

      for (const match of fileContents.matchAll(
        /CREATE POLICY "([^"]+)"\s+ON "([^"]+)"[\s\S]*?\bTO\s+("[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)/g,
      )) {
        const target = this.readPolicyTarget(match[3]!);
        if (target !== "public") {
          nonPublicPolicyTargets.push({
            migrationFileName: migrationFile.fileName,
            policyName: match[1]!,
            tableName: match[2]!,
            target,
          });
        }
      }
    }

    const missingPolicyTables = [...rlsEnabledTables].filter((tableName) => !policyTables.has(tableName)).sort();
    return {
      rlsEnabledTables: [...rlsEnabledTables].sort(),
      policyTables: [...policyTables].sort(),
      missingPolicyTables,
      nonPublicPolicyTargets,
    };
  }

  private readPolicyTarget(rawTarget: string): string {
    if (rawTarget.startsWith("\"") && rawTarget.endsWith("\"")) {
      return rawTarget.slice(1, -1).replace(/""/g, "\"");
    }

    return rawTarget;
  }
}
