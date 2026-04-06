import { resolve } from "node:path";
import { RlsPolicyAuditor } from "../src/db/rls_policy_auditor.ts";

/**
 * Runs the migration-side RLS audit as a standalone script so CI and local development can fail
 * early when a table enables row-level security without also defining a policy.
 */
export class CheckRlsPoliciesScript {
  run(): void {
    const auditor = new RlsPolicyAuditor();
    const report = auditor.audit(resolve(import.meta.dirname, "../drizzle"));
    if (report.missingPolicyTables.length === 0) {
      process.stdout.write(`RLS policy audit passed for ${report.rlsEnabledTables.length} tables.\n`);
      return;
    }

    process.stderr.write(
      [
        "Missing RLS policies for the following tables:",
        ...report.missingPolicyTables.map((tableName) => `- ${tableName}`),
      ].join("\n") + "\n",
    );
    process.exitCode = 1;
  }
}

new CheckRlsPoliciesScript().run();
