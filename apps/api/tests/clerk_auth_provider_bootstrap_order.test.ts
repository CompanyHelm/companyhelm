import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("Clerk bootstrap applies company context before company-scoped inserts", () => {
  const source = readFileSync(
    new URL("../src/auth/clerk/clerk_auth_provider.ts", import.meta.url),
    "utf8",
  );

  const transactionBlockMatch = source.match(
    /return db\.transaction\(async \(transaction\) => \{([\s\S]*?)return \{/,
  );

  assert.ok(transactionBlockMatch, "expected auth transaction block");

  const transactionBlock = transactionBlockMatch[1] ?? "";
  const applyContextIndex = transactionBlock.indexOf("await database.applyCompanyContext(");
  const ensureComputeProviderIndex = transactionBlock.indexOf("await this.ensureCompanyHelmComputeProviderDefinition(transaction, company.id);");
  const ensureMembershipIndex = transactionBlock.indexOf("await this.ensureMembership(transaction, {");

  assert.notEqual(applyContextIndex, -1, "expected company context application in auth transaction");
  assert.notEqual(ensureComputeProviderIndex, -1, "expected compute provider bootstrap in auth transaction");
  assert.notEqual(ensureMembershipIndex, -1, "expected membership bootstrap in auth transaction");
  assert.ok(
    applyContextIndex < ensureComputeProviderIndex,
    "expected company context to be applied before company-scoped compute provider bootstrap",
  );
  assert.ok(
    ensureMembershipIndex < ensureComputeProviderIndex,
    "expected membership bootstrap to happen before company-scoped compute provider bootstrap",
  );

  const findOrCreateCompanyMatch = source.match(
    /private async findOrCreateCompany\([\s\S]*?\n {2}\}\n\n {2}private async findCompanyByClerkOrganizationId/,
  );
  assert.ok(findOrCreateCompanyMatch, "expected findOrCreateCompany implementation");
  assert.doesNotMatch(
    findOrCreateCompanyMatch[0],
    /ensureCompanyHelmComputeProviderDefinition/,
  );
});
