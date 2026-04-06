import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "vitest";
import { RlsPolicyAuditor } from "../src/db/rls_policy_auditor.ts";

class RlsPolicyAuditorTestHarness {
  static createTempMigrationDirectory(): string {
    return mkdtempSync(join(tmpdir(), "companyhelm-rls-audit-"));
  }

  static removeTempMigrationDirectory(directoryPath: string): void {
    rmSync(directoryPath, { recursive: true, force: true });
  }
}

test("RlsPolicyAuditor reports no missing policies for the current migration set", () => {
  const auditor = new RlsPolicyAuditor();
  const report = auditor.audit(resolve(import.meta.dirname, "../drizzle"));

  assert.deepEqual(report.missingPolicyTables, []);
  assert.ok(report.rlsEnabledTables.includes("user_session_reads"));
  assert.ok(report.policyTables.includes("user_session_reads"));
});

test("RlsPolicyAuditor flags tables that enable row-level security without defining a policy", () => {
  const tempDirectoryPath = RlsPolicyAuditorTestHarness.createTempMigrationDirectory();

  try {
    writeFileSync(join(tempDirectoryPath, "0001_missing_policy.sql"), [
      'ALTER TABLE "example_table" ENABLE ROW LEVEL SECURITY;',
      '--> statement-breakpoint',
      'CREATE POLICY "example_policy" ON "other_table" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);',
    ].join("\n"));

    const auditor = new RlsPolicyAuditor();
    const report = auditor.audit(tempDirectoryPath);

    assert.deepEqual(report.missingPolicyTables, ["example_table"]);
  } finally {
    RlsPolicyAuditorTestHarness.removeTempMigrationDirectory(tempDirectoryPath);
  }
});
