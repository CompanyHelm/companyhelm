import assert from "node:assert/strict";
import { test } from "vitest";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { PlatformAdminCompaniesQueryResolver } from "../src/graphql/resolvers/platform_admin_companies.ts";

class PlatformAdminCompaniesQueryTestHarness {
  readonly enhancedLoggingCompanyIds: string[] = [];

  createResolver(): PlatformAdminCompaniesQueryResolver {
    return new PlatformAdminCompaniesQueryResolver({
      getCompanyState: async (companyId: string) => {
        this.enhancedLoggingCompanyIds.push(companyId);

        return {
          components: ["session_process_cleanup"],
          enabled: true,
          expiresAt: "2026-04-26T12:00:00.000Z",
          sessionIds: ["session-1"],
          ttlSeconds: 3_600,
        };
      },
    } as never);
  }

  static createContext(isPlatformAdmin: boolean) {
    let selectCallCount = 0;
    const whereConditions: unknown[] = [];
    const tx = {
      select() {
        selectCallCount += 1;
        if (selectCallCount === 1) {
          return {
            from() {
              const countRows = [{ totalCount: 1 }];
              return {
                then(resolve: (rows: typeof countRows) => unknown) {
                  return Promise.resolve(countRows).then(resolve);
                },
                where(condition: unknown) {
                  whereConditions.push(condition);
                  return countRows;
                },
              };
            },
          };
        }

        if (selectCallCount === 2) {
          return {
            from() {
              const rowQuery = {
                groupBy() {
                  return rowQuery;
                },
                where(condition: unknown) {
                  whereConditions.push(condition);
                  return rowQuery;
                },
                orderBy() {
                  return {
                    limit() {
                      return {
                        async offset() {
                          return [{
                            clerkOrganizationId: "org_clerk_123",
                            deletionRequestedAt: null,
                            deletionStatus: "active",
                            id: "company-1",
                            memberCount: 3,
                            name: "Acme Workspace",
                            plan: "pro",
                            slug: "acme",
                          }];
                        },
                      };
                    },
                  };
                },
              };
              return {
                leftJoin() {
                  return rowQuery;
                },
              };
            },
          };
        }

        throw new Error("Unexpected select call.");
      },
    };

    return {
      context: {
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
            id: "company-auth",
            name: "Current Company",
          },
        },
        app_runtime_transaction_provider: {
          async transaction(callback: (transaction: unknown) => Promise<unknown>) {
            return callback(tx);
          },
        },
      } as GraphqlRequestContext,
      whereConditions,
    };
  }
}

test("PlatformAdminCompanies query lists searchable paginated companies for platform admins", async () => {
  const harness = new PlatformAdminCompaniesQueryTestHarness();
  const resolver = harness.createResolver();
  const contextHarness = PlatformAdminCompaniesQueryTestHarness.createContext(true);

  const result = await resolver.execute(null, {
    page: 1,
    pageSize: 25,
    search: "acme",
  }, contextHarness.context);

  assert.deepEqual(result, {
    nodes: [{
      id: "company-1",
      name: "Acme Workspace",
      slug: "acme",
      plan: "pro",
      deletionStatus: "active",
      clerkOrganizationId: "org_clerk_123",
      memberCount: 3,
      deletionRequestedAt: null,
      enhancedLogging: {
        components: ["session_process_cleanup"],
        enabled: true,
        expiresAt: "2026-04-26T12:00:00.000Z",
        sessionIds: ["session-1"],
        ttlSeconds: 3_600,
      },
    }],
    page: 1,
    pageSize: 25,
    totalCount: 1,
    totalPages: 1,
  });
  assert.equal(contextHarness.whereConditions.length, 2);
  assert.deepEqual(harness.enhancedLoggingCompanyIds, ["company-1"]);
});

test("PlatformAdminCompanies query rejects non-platform-admin users", async () => {
  const resolver = new PlatformAdminCompaniesQueryResolver();
  const harness = PlatformAdminCompaniesQueryTestHarness.createContext(false);

  await assert.rejects(
    () => resolver.execute(null, {
      page: 1,
      pageSize: 25,
    }, harness.context),
    /Platform admin access required\./,
  );
});
