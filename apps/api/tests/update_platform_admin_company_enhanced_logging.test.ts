import assert from "node:assert/strict";
import { test } from "vitest";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { UpdatePlatformAdminCompanyEnhancedLoggingMutation } from "../src/graphql/mutations/update_platform_admin_company_enhanced_logging.ts";

class UpdatePlatformAdminCompanyEnhancedLoggingTestService {
  readonly calls: unknown[] = [];

  async disableCompany(companyId: string) {
    this.calls.push({ companyId, method: "disableCompany" });

    return {
      components: [],
      enabled: false,
      expiresAt: null,
      sessionIds: [],
      ttlSeconds: null,
    };
  }

  async enableCompany(input: unknown) {
    this.calls.push({ input, method: "enableCompany" });

    return {
      components: ["session_process_cleanup"],
      enabled: true,
      expiresAt: "2026-04-26T12:00:00.000Z",
      sessionIds: ["session-1"],
      ttlSeconds: 3_600,
    };
  }

  validateTtlSeconds(ttlSeconds: number): void {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 86_400) {
      throw new Error("TTL must be between 60 and 86400 seconds.");
    }
  }
}

class UpdatePlatformAdminCompanyEnhancedLoggingTestHarness {
  readonly service = new UpdatePlatformAdminCompanyEnhancedLoggingTestService();
  readonly mutation = new UpdatePlatformAdminCompanyEnhancedLoggingMutation(this.service as never);

  createContext(isPlatformAdmin: boolean, companyExists = true): GraphqlRequestContext {
    return {
      authSession: {
        token: "jwt-token",
        user: {
          id: "user-1",
          email: "admin@example.com",
          firstName: "Admin",
          isPlatformAdmin,
          lastName: "User",
          provider: "clerk",
          providerSubject: "user_clerk_1",
        },
        company: {
          id: "current-company",
          name: "Current Company",
        },
      },
      app_runtime_transaction_provider: {
        async transaction(callback: (transaction: unknown) => Promise<unknown>) {
          return callback({
            select() {
              return {
                from() {
                  return {
                    where() {
                      return {
                        async limit() {
                          return companyExists ? [{ id: "company-1" }] : [];
                        },
                      };
                    },
                  };
                },
              };
            },
          });
        },
      },
    } as GraphqlRequestContext;
  }
}

test("UpdatePlatformAdminCompanyEnhancedLogging enables logging for platform admins", async () => {
  const harness = new UpdatePlatformAdminCompanyEnhancedLoggingTestHarness();

  const result = await harness.mutation.execute(null, {
    input: {
      companyId: "company-1",
      components: ["session_process_cleanup"],
      enabled: true,
      sessionIds: ["session-1"],
      ttlSeconds: 3_600,
    },
  }, harness.createContext(true));

  assert.deepEqual(result, {
    components: ["session_process_cleanup"],
    enabled: true,
    expiresAt: "2026-04-26T12:00:00.000Z",
    sessionIds: ["session-1"],
    ttlSeconds: 3_600,
  });
  assert.deepEqual(harness.service.calls, [{
    input: {
      companyId: "company-1",
      components: ["session_process_cleanup"],
      sessionIds: ["session-1"],
      ttlSeconds: 3_600,
    },
    method: "enableCompany",
  }]);
});

test("UpdatePlatformAdminCompanyEnhancedLogging disables logging for platform admins", async () => {
  const harness = new UpdatePlatformAdminCompanyEnhancedLoggingTestHarness();

  const result = await harness.mutation.execute(null, {
    input: {
      companyId: "company-1",
      enabled: false,
    },
  }, harness.createContext(true));

  assert.equal(result.enabled, false);
  assert.deepEqual(harness.service.calls, [{ companyId: "company-1", method: "disableCompany" }]);
});

test("UpdatePlatformAdminCompanyEnhancedLogging rejects non-admin, invalid TTL, and missing company", async () => {
  const harness = new UpdatePlatformAdminCompanyEnhancedLoggingTestHarness();

  await assert.rejects(
    () => harness.mutation.execute(null, {
      input: {
        companyId: "company-1",
        enabled: true,
        ttlSeconds: 3_600,
      },
    }, harness.createContext(false)),
    /Platform admin access required\./,
  );
  await assert.rejects(
    () => harness.mutation.execute(null, {
      input: {
        companyId: "company-1",
        enabled: true,
        ttlSeconds: 30,
      },
    }, harness.createContext(true)),
    /TTL must be between 60 and 86400 seconds\./,
  );
  await assert.rejects(
    () => harness.mutation.execute(null, {
      input: {
        companyId: "missing-company",
        enabled: false,
      },
    }, harness.createContext(true, false)),
    /Company not found\./,
  );
});
