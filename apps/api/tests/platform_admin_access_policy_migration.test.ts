import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

/**
 * Keeps platform-owned LLM credential RLS from drifting back to an unconditional runtime allow
 * policy. These rows are not company scoped, so every trusted access path must opt in with the
 * transaction-local platform admin access setting.
 */
class PlatformAdminAccessPolicyMigrationTest {
  private static readonly migrationSql = readFileSync(
    new URL("../drizzle/0143_platform_admin_access_policy.sql", import.meta.url),
    "utf8",
  );

  static assertCredentialPolicyRequiresPlatformCredentialAccess(): void {
    assert.match(
      this.migrationSql,
      /CREATE POLICY "platform_model_provider_credentials_platform_admin_access_policy"/,
    );
    assert.match(
      this.migrationSql,
      /ON "platform_model_provider_credentials"\s+AS PERMISSIVE\s+FOR ALL\s+TO public\s+USING \(current_setting\('app.platform_admin_access', true\) = 'true'\)\s+WITH CHECK \(current_setting\('app.platform_admin_access', true\) = 'true'\);/s,
    );
  }

  static assertCredentialModelPolicyRequiresPlatformCredentialAccess(): void {
    assert.match(
      this.migrationSql,
      /CREATE POLICY "platform_model_provider_credential_models_platform_admin_access_policy"/,
    );
    assert.match(
      this.migrationSql,
      /ON "platform_model_provider_credential_models"\s+AS PERMISSIVE\s+FOR ALL\s+TO public\s+USING \(current_setting\('app.platform_admin_access', true\) = 'true'\)\s+WITH CHECK \(current_setting\('app.platform_admin_access', true\) = 'true'\);/s,
    );
  }

  static assertBroadPoliciesAreNotReintroduced(): void {
    assert.doesNotMatch(this.migrationSql, /USING \(true\)\s+WITH CHECK \(true\)/);
  }
}

test("platform admin access policy requires an explicit transaction flag", () => {
  PlatformAdminAccessPolicyMigrationTest.assertCredentialPolicyRequiresPlatformCredentialAccess();
  PlatformAdminAccessPolicyMigrationTest.assertCredentialModelPolicyRequiresPlatformCredentialAccess();
  PlatformAdminAccessPolicyMigrationTest.assertBroadPoliciesAreNotReintroduced();
});
