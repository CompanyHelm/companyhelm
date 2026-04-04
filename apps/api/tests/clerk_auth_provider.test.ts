import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { ClerkAuthProvider } from "../src/auth/clerk/clerk_auth_provider.ts";

/**
 * Creates the minimal Clerk auth fixtures needed to exercise provisioning and session construction.
 */
class ClerkAuthProviderTestHarness {
  static createUniqueViolationError(message = "duplicate key value violates unique constraint") {
    return Object.assign(new Error(message), {
      code: "23505",
    });
  }

  static createConfigMock(): Config {
    return {
      auth: {
        provider: "clerk",
        clerk: {
          secret_key: "clerk-secret-key",
          publishable_key: "clerk-publishable-key",
          jwks_url: "https://clerk.example/.well-known/jwks.json",
          authorized_parties: ["http://localhost:5173"],
        },
      },
      companyhelm: {
        e2b: {
          api_key: "e2b-local-api-key",
        },
      },
    } as Config;
  }

  static createMissingRecordsDatabaseMock() {
    const insertedValues: Array<Record<string, unknown>> = [];
    const scopedCompanyIds: string[] = [];
    let selectCallCount = 0;
    let insertCallCount = 0;

    const transaction = {
      async execute() {
        return [];
      },
      select() {
        selectCallCount += 1;
        if (selectCallCount <= 5) {
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

    const database = {
      insertedValues,
      scopedCompanyIds,
      getDatabase() {
        return {
          async transaction<T>(callback: (database_: typeof transaction) => Promise<T>) {
            return callback(transaction);
          },
        };
      },
      async applyCompanyContext(_database: unknown, companyId: string) {
        scopedCompanyIds.push(companyId);
      },
    };

    return database;
  }

  static createExistingRecordsDatabaseMock() {
    const scopedCompanyIds: string[] = [];
    let selectCallCount = 0;

    const transaction = {
      async execute() {
        return [];
      },
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
        return {
          values() {
            return undefined;
          },
        };
      },
    };

    const database = {
      scopedCompanyIds,
      getDatabase() {
        return {
          async transaction<T>(callback: (database_: typeof transaction) => Promise<T>) {
            return callback(transaction);
          },
        };
      },
      async applyCompanyContext(_database: unknown, companyId: string) {
        scopedCompanyIds.push(companyId);
      },
    };

    return database;
  }

  static createExistingEmailOnlyDatabaseMock() {
    const scopedCompanyIds: string[] = [];
    let selectCallCount = 0;

    const transaction = {
      async execute() {
        return [];
      },
      select() {
        selectCallCount += 1;
        if (selectCallCount === 1) {
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

        if (selectCallCount === 2) {
          return {
            from() {
              return {
                where() {
                  return {
                    limit: async () => [{
                      id: "local-user-email",
                      clerk_user_id: null,
                      email: "existing@example.com",
                      first_name: "Existing",
                      last_name: "User",
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

        if (selectCallCount === 4) {
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
        return {
          values() {
            return {
              async returning() {
                return [];
              },
            };
          },
        };
      },
    };

    const database = {
      scopedCompanyIds,
      getDatabase() {
        return {
          async transaction<T>(callback: (database_: typeof transaction) => Promise<T>) {
            return callback(transaction);
          },
        };
      },
      async applyCompanyContext(_database: unknown, companyId: string) {
        scopedCompanyIds.push(companyId);
      },
    };

    return database;
  }

  static createConcurrentProvisioningRaceDatabaseMock() {
    const scopedCompanyIds: string[] = [];
    let insertCallCount = 0;
    let selectCallCount = 0;

    const transaction = {
      async execute() {
        return [];
      },
      select() {
        selectCallCount += 1;
        if (selectCallCount === 1 || selectCallCount === 2) {
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

        if (selectCallCount === 3) {
          return {
            from() {
              return {
                where() {
                  return {
                    limit: async () => [{
                      id: "local-user-race",
                      clerk_user_id: "user_clerk_race",
                      email: "race@example.com",
                      first_name: "Race",
                      last_name: "Condition",
                    }],
                  };
                },
              };
            },
          };
        }

        if (selectCallCount === 4) {
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

        if (selectCallCount === 5) {
          return {
            from() {
              return {
                where() {
                  return {
                    limit: async () => [{
                      id: "local-company-race",
                      clerk_organization_id: "org_clerk_race",
                      name: "Race Org",
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
        insertCallCount += 1;
        return {
          values() {
            if (insertCallCount <= 4) {
              throw ClerkAuthProviderTestHarness.createUniqueViolationError();
            }

            throw new Error("Unexpected insert call.");
          },
        };
      },
    };

    const database = {
      scopedCompanyIds,
      getDatabase() {
        return {
          async transaction<T>(callback: (database_: typeof transaction) => Promise<T>) {
            return callback(transaction);
          },
        };
      },
      async applyCompanyContext(_database: unknown, companyId: string) {
        scopedCompanyIds.push(companyId);
      },
    };

    return database;
  }
}

test("clerk auth provider provisions missing local user, company, and membership from JWT claims", async () => {
  const db = ClerkAuthProviderTestHarness.createMissingRecordsDatabaseMock();
  const provider = ClerkAuthProvider.createForTest(
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
                  o: {
                    nam: "Example Org",
                  },
                },
              };
            },
          };
        },
        users: {
          async getUser() {
            return {
              firstName: "User",
              lastName: "Example",
              primaryEmailAddressId: "email_1",
              emailAddresses: [{
                id: "email_1",
                emailAddress: "user@example.com",
              }],
            };
          },
        },
      },
      jwtKeyLoader: {
        async load() {
          return "clerk-jwt-key";
        },
      },
    },
  );

  const session = await provider.authenticateBearerToken(db as never, "clerk-token");

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
  assert.equal(db.insertedValues.length, 4);
  assert.equal(db.insertedValues[0]?.clerkUserId, "user_clerk_1");
  assert.equal(db.insertedValues[1]?.clerkOrganizationId, "org_clerk_1");
  assert.equal(db.insertedValues[2]?.companyId, "local-company-1");
  assert.equal(db.insertedValues[2]?.name, "CompanyHelm");
  assert.equal(db.insertedValues[2]?.provider, "e2b");
  assert.equal(db.insertedValues[3]?.companyId, "local-company-1");
  assert.equal(db.insertedValues[3]?.userId, "local-user-1");
  assert.deepEqual(db.scopedCompanyIds, ["local-company-1"]);
});

test("clerk auth provider reuses existing local user and company when already provisioned", async () => {
  const db = ClerkAuthProviderTestHarness.createExistingRecordsDatabaseMock();
  const provider = ClerkAuthProvider.createForTest(
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
                  o: {
                    slg: "existing-org",
                  },
                },
              };
            },
          };
        },
        users: {
          async getUser() {
            throw new Error("No Clerk user fetch expected.");
          },
        },
      },
      jwtKeyLoader: {
        async load() {
          return "clerk-jwt-key";
        },
      },
    },
  );

  const session = await provider.authenticateBearerToken(db as never, "clerk-token");

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
  assert.deepEqual(db.scopedCompanyIds, ["local-company-9"]);
});

test("clerk auth provider rejects unauthenticated request states from Clerk", async () => {
  const provider = ClerkAuthProvider.createForTest(
    ClerkAuthProviderTestHarness.createConfigMock(),
    {
      clerkClient: {
        async authenticateRequest() {
          return {
            isAuthenticated: false,
          };
        },
        users: {
          async getUser() {
            throw new Error("No Clerk user fetch expected.");
          },
        },
      },
      jwtKeyLoader: {
        async load() {
          return "clerk-jwt-key";
        },
      },
    },
  );

  await assert.rejects(
    provider.authenticateBearerToken(ClerkAuthProviderTestHarness.createExistingRecordsDatabaseMock() as never, "clerk-token"),
    /Clerk bearer token is invalid\./,
  );
});

test("clerk auth provider reuses existing local user matched by email when clerk_user_id is not populated yet", async () => {
  const db = ClerkAuthProviderTestHarness.createExistingEmailOnlyDatabaseMock();
  const provider = ClerkAuthProvider.createForTest(
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
                  o: {
                    slg: "existing-org",
                  },
                },
              };
            },
          };
        },
        users: {
          async getUser() {
            return {
              firstName: "Existing",
              lastName: "User",
              primaryEmailAddressId: "email_9",
              emailAddresses: [{
                id: "email_9",
                emailAddress: "existing@example.com",
              }],
            };
          },
        },
      },
      jwtKeyLoader: {
        async load() {
          return "clerk-jwt-key";
        },
      },
    },
  );

  const session = await provider.authenticateBearerToken(db as never, "clerk-token");

  assert.deepEqual(session, {
    token: "clerk-token",
    user: {
      id: "local-user-email",
      email: "existing@example.com",
      firstName: "Existing",
      lastName: "User",
      provider: "clerk",
      providerSubject: "user_clerk_9",
    },
    company: {
      id: "local-company-9",
      name: "Existing Org",
    },
  });
  assert.deepEqual(db.scopedCompanyIds, ["local-company-9"]);
});

test("clerk auth provider tolerates concurrent provisioning races for first-time users", async () => {
  const db = ClerkAuthProviderTestHarness.createConcurrentProvisioningRaceDatabaseMock();
  const provider = ClerkAuthProvider.createForTest(
    ClerkAuthProviderTestHarness.createConfigMock(),
    {
      clerkClient: {
        async authenticateRequest() {
          return {
            isAuthenticated: true,
            toAuth() {
              return {
                isAuthenticated: true,
                userId: "user_clerk_race",
                orgId: "org_clerk_race",
                sessionClaims: {
                  o: {
                    nam: "Race Org",
                  },
                },
              };
            },
          };
        },
        users: {
          async getUser() {
            return {
              firstName: "Race",
              lastName: "Condition",
              primaryEmailAddressId: "email_race",
              emailAddresses: [{
                id: "email_race",
                emailAddress: "race@example.com",
              }],
            };
          },
        },
      },
      jwtKeyLoader: {
        async load() {
          return "clerk-jwt-key";
        },
      },
    },
  );

  const session = await provider.authenticateBearerToken(db as never, "clerk-token");

  assert.deepEqual(session, {
    token: "clerk-token",
    user: {
      id: "local-user-race",
      email: "race@example.com",
      firstName: "Race",
      lastName: "Condition",
      provider: "clerk",
      providerSubject: "user_clerk_race",
    },
    company: {
      id: "local-company-race",
      name: "Race Org",
    },
  });
  assert.deepEqual(db.scopedCompanyIds, ["local-company-race"]);
});
