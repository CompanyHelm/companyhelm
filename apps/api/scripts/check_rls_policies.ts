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
    if (report.missingPolicyTables.length === 0 && report.nonPublicPolicyTargets.length === 0) {
      process.stdout.write(`RLS policy audit passed for ${report.rlsEnabledTables.length} tables.\n`);
      return;
    }

    const errorLines: string[] = [];
    if (report.missingPolicyTables.length > 0) {
      errorLines.push(
        "Missing RLS policies for the following tables:",
        ...report.missingPolicyTables.map((tableName) => `- ${tableName}`),
      );
    }

    if (report.nonPublicPolicyTargets.length > 0) {
      errorLines.push(
        "RLS policies must target public so they remain independent of the configured runtime role:",
        ...report.nonPublicPolicyTargets.map((policyTarget) =>
          `- ${policyTarget.migrationFileName}: ${policyTarget.policyName} on ${policyTarget.tableName} targets ${policyTarget.target}`
        ),
      );
    }

    process.stderr.write(errorLines.join("\n") + "\n");
    process.exitCode = 1;
  }
}

new CheckRlsPoliciesScript().run();
