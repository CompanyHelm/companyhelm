import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("Clerk bootstrap applies company context before company-scoped inserts", () => {
  const source = readFileSync(
    new URL("../src/auth/clerk/clerk_auth_provider.ts", import.meta.url),
    "utf8",
  );

  const transactionStartIndex = source.indexOf("return db.transaction(async (transaction) => {");
  assert.notEqual(transactionStartIndex, -1, "expected auth transaction block");

  const applyContextIndex = source.indexOf("await database.applyCompanyContext(");
  const ensureCompanyDefaultsIndex = source.indexOf(
    "await this.companyBootstrapService.ensureCompanyDefaults(transaction, company.id);",
  );
  const ensureMembershipIndex = source.indexOf("await this.companyBootstrapService.ensureMembership(transaction, {");

  assert.notEqual(applyContextIndex, -1, "expected company context application in auth transaction");
  assert.notEqual(ensureCompanyDefaultsIndex, -1, "expected company defaults bootstrap in auth transaction");
  assert.notEqual(ensureMembershipIndex, -1, "expected membership bootstrap in auth transaction");
  assert.ok(
    transactionStartIndex < applyContextIndex,
    "expected company context application inside the auth transaction",
  );
  assert.ok(
    transactionStartIndex < ensureMembershipIndex,
    "expected membership bootstrap inside the auth transaction",
  );
  assert.ok(
    transactionStartIndex < ensureCompanyDefaultsIndex,
    "expected company defaults bootstrap inside the auth transaction",
  );
  assert.ok(
    applyContextIndex < ensureCompanyDefaultsIndex,
    "expected company context to be applied before company-scoped default bootstrap",
  );
  assert.ok(
    ensureMembershipIndex < ensureCompanyDefaultsIndex,
    "expected membership bootstrap to happen before company-scoped default bootstrap",
  );

  assert.doesNotMatch(
    source,
    /private async ensureCompanyHelmComputeProviderDefinition/,
  );
  assert.doesNotMatch(
    source,
    /private async findOrCreateCompany/,
  );
});
