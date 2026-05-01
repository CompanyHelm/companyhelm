import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { GrantPlatformAdminMutation } from "../src/graphql/mutations/grant_platform_admin.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";

class GrantPlatformAdminMutationTestHarness {
  /**
   * Builds the smallest transaction provider needed to prove the mutation writes the dedicated
   * platform-admin grant row and returns the promoted user shape consumed by the admin directory.
   */
  static createContext(isPlatformAdmin: boolean, insertCalls: Array<Record<string, unknown>>): GraphqlRequestContext {
    return {
      isPlatformAdmin,
      authSession: {
        token: "jwt-token",
        user: {
          email: "admin@example.com",
          firstName: "Admin",
          id: "admin-user",
          lastName: "User",
          provider: "clerk",
          providerSubject: "clerk-admin-user",
        },
        company: {
          id: "company-1",
          name: "CompanyHelm",
        },
      },
      app_runtime_transaction_provider: {
        async transaction(callback) {
          return callback({
            select() {
              return {
                from() {
                  return {
                    where() {
                      return {
                        async limit() {
                          return [{
                            companyCount: 2,
                            createdAt: new Date("2026-04-01T10:00:00.000Z"),
                            email: "user@example.com",
                            firstName: "Target",
                            id: "target-user",
                            lastName: "User",
                            updatedAt: new Date("2026-04-02T10:00:00.000Z"),
                          }];
                        },
                      };
                    },
                  };
                },
              };
            },
            insert() {
              return {
                values(value: Record<string, unknown>) {
                  insertCalls.push(value);
                  return {
                    async onConflictDoNothing() {},
                  };
                },
              };
            },
          } as never);
        },
      },
    } as GraphqlRequestContext;
  }
}

test("GrantPlatformAdmin grants platform admin access from a dedicated table", async () => {
  const insertCalls: Array<Record<string, unknown>> = [];
  const mutation = new GrantPlatformAdminMutation();

  const result = await mutation.execute(
    null,
    {
      input: {
        userId: "target-user",
      },
    },
    GrantPlatformAdminMutationTestHarness.createContext(true, insertCalls),
  );

  assert.deepEqual(result, {
    companyCount: 2,
    createdAt: "2026-04-01T10:00:00.000Z",
    email: "user@example.com",
    firstName: "Target",
    id: "target-user",
    isPlatformAdmin: true,
    lastName: "User",
    updatedAt: "2026-04-02T10:00:00.000Z",
  });
  assert.equal(insertCalls.length, 1);
  assert.equal(insertCalls[0]?.userId, "target-user");
  assert.equal(insertCalls[0]?.grantedByUserId, "admin-user");
  assert.ok(insertCalls[0]?.createdAt instanceof Date);
});

test("GrantPlatformAdmin rejects non-platform-admin callers", async () => {
  const mutation = new GrantPlatformAdminMutation();

  await assert.rejects(
    mutation.execute(
      null,
      {
        input: {
          userId: "target-user",
        },
      },
      GrantPlatformAdminMutationTestHarness.createContext(false, []),
    ),
    /Platform admin access required\./,
  );
});
