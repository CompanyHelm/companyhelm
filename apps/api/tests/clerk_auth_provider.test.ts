import assert from "node:assert/strict";
import { test } from "vitest";
import type { ConfigDocument } from "../src/config/schema.ts";
import { AuthProviderFactory } from "../src/auth/auth_provider_factory.ts";

/**
 * Creates the minimal Clerk auth fixtures needed to exercise provisioning and session construction.
 */
class ClerkAuthProviderTestHarness {
  static createConfigMock(): ConfigDocument {
    return {
      auth: {
        provider: "clerk",
        clerk: {
          secret_key: "clerk-secret-key",
          publishable_key: "clerk-publishable-key",
          jwt_key: "clerk-jwt-key",
          authorized_parties: ["http://localhost:5173"],
        },
      },
    } as ConfigDocument;
  }

  static createMissingRecordsDatabaseMock() {
    const insertedValues: Array<Record<string, unknown>> = [];
    let selectCallCount = 0;
    let insertCallCount = 0;

    const transaction = {
      select() {
        selectCallCount += 1;
        if (selectCallCount <= 3) {
          return {
            from() {
              return {
                where() {
                  return {
                    limit: async () => [],
                  };
                },
              };
            },
          };
        }

        throw new Error("Unexpected select call.");
      },
      insert() {
        insertCallCount += 1;
        return {
          values(value: Record<string, unknown>) {
            insertedValues.push(value);

            if (insertCallCount === 1) {
              return {
                async returning() {
                  return [{
                    id: "local-user-1",
                    clerk_user_id: "user_clerk_1",
                    email: "user@example.com",
                    first_name: "User",
                    last_name: "Example",
                  }];
                },
              };
            }

            if (insertCallCount === 2) {
              return {
                async returning() {
                  return [{
                    id: "local-company-1",
                    clerk_organization_id: "org_clerk_1",
                    name: "Example Org",
                  }];
                },
              };
            }

            return {
              async returning() {
                return [];
              },
            };
          },
        };
      },
    };

    return {
      insertedValues,
      async transaction<T>(callback: (database: typeof transaction) => Promise<T>) {
        return callback(transaction);
      },
    };
  }

  static createExistingRecordsDatabaseMock() {
    let selectCallCount = 0;

    const transaction = {
      select() {
        selectCallCount += 1;
        if (selectCallCount === 1) {
          return {
            from() {
              return {
                where() {
                  return {
                    limit: async () => [{
                      id: "local-user-9",
                      clerk_user_id: "user_clerk_9",
                      email: "existing@example.com",
                      first_name: "Existing",
                      last_name: null,
                    }],
                  };
                },
              };
            },
          };
        }

        if (selectCallCount === 2) {
          return {
            from() {
              return {
                where() {
                  return {
                    limit: async () => [{
                      id: "local-company-9",
                      clerk_organization_id: "org_clerk_9",
                      name: "Existing Org",
                    }],
                  };
                },
              };
            },
          };
        }

        if (selectCallCount === 3) {
          return {
            from() {
              return {
                where() {
                  return {
                    limit: async () => [{
                      companyId: "local-company-9",
                      userId: "local-user-9",
                    }],
                  };
                },
              };
            },
          };
        }

        throw new Error("Unexpected select call.");
      },
      insert() {
        throw new Error("No inserts expected.");
      },
    };

    return {
      async transaction<T>(callback: (database: typeof transaction) => Promise<T>) {
        return callback(transaction);
      },
    };
  }
}

test("clerk auth provider provisions missing local user, company, and membership from JWT claims", async () => {
  const provider = AuthProviderFactory.createAuthProvider(
    ClerkAuthProviderTestHarness.createConfigMock(),
    {
      clerkClient: {
        async authenticateRequest() {
          return {
            isAuthenticated: true,
            toAuth() {
              return {
                isAuthenticated: true,
                userId: "user_clerk_1",
                orgId: "org_clerk_1",
                sessionClaims: {
                  email: "user@example.com",
                  first_name: "User",
                  last_name: "Example",
                  organization_name: "Example Org",
                },
              };
            },
          };
        },
      },
    },
  );
  const db = ClerkAuthProviderTestHarness.createMissingRecordsDatabaseMock();

  const session = await provider.authenticateBearerToken(db as never, "clerk-token", {
    "x-company-id": "ignored-company-id",
  });

  assert.deepEqual(session, {
    token: "clerk-token",
    user: {
      id: "local-user-1",
      email: "user@example.com",
      firstName: "User",
      lastName: "Example",
      provider: "clerk",
      providerSubject: "user_clerk_1",
    },
    company: {
      id: "local-company-1",
      name: "Example Org",
    },
  });
  assert.equal(db.insertedValues.length, 3);
  assert.equal(db.insertedValues[0]?.clerkUserId, "user_clerk_1");
  assert.equal(db.insertedValues[1]?.clerkOrganizationId, "org_clerk_1");
  assert.equal(db.insertedValues[2]?.companyId, "local-company-1");
  assert.equal(db.insertedValues[2]?.userId, "local-user-1");
});

test("clerk auth provider reuses existing local user and company when already provisioned", async () => {
  const provider = AuthProviderFactory.createAuthProvider(
    ClerkAuthProviderTestHarness.createConfigMock(),
    {
      clerkClient: {
        async authenticateRequest() {
          return {
            isAuthenticated: true,
            toAuth() {
              return {
                isAuthenticated: true,
                userId: "user_clerk_9",
                orgId: "org_clerk_9",
                sessionClaims: {
                  email: "existing@example.com",
                  name: "Existing User",
                  o: {
                    slg: "existing-org",
                  },
                },
              };
            },
          };
        },
      },
    },
  );
  const db = ClerkAuthProviderTestHarness.createExistingRecordsDatabaseMock();

  const session = await provider.authenticateBearerToken(db as never, "clerk-token", {
    "x-company-id": "ignored-company-id",
  });

  assert.deepEqual(session, {
    token: "clerk-token",
    user: {
      id: "local-user-9",
      email: "existing@example.com",
      firstName: "Existing",
      lastName: null,
      provider: "clerk",
      providerSubject: "user_clerk_9",
    },
    company: {
      id: "local-company-9",
      name: "Existing Org",
    },
  });
});

test("clerk auth provider rejects unauthenticated request states from Clerk", async () => {
  const provider = AuthProviderFactory.createAuthProvider(
    ClerkAuthProviderTestHarness.createConfigMock(),
    {
      clerkClient: {
        async authenticateRequest() {
          return {
            isAuthenticated: false,
          };
        },
      },
    },
  );

  await assert.rejects(
    provider.authenticateBearerToken(ClerkAuthProviderTestHarness.createExistingRecordsDatabaseMock() as never, "clerk-token", {
      "x-company-id": "ignored-company-id",
    }),
    /Clerk bearer token is invalid\./,
  );
});
