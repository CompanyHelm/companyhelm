import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import { PlatformAdminUsersQueryResolver } from "../src/graphql/resolvers/platform_admin_users.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";

class PlatformAdminUsersQueryTestHarness {
  static createConfigMock(): Config {
    return {
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      auth: {
        provider: "clerk",
      },
    } as Config;
  }

  static createDatabaseMock(isPlatformAdmin = true) {
    let selectCallCount = 0;

    return {
      getDatabase() {
        return {
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
                        async limit() {
                          return isPlatformAdmin ? [{ userId: "user-123" }] : [];
                        },
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
                      return [{
                        totalCount: 2,
                      }];
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
                        orderBy() {
                          return {
                            limit() {
                              return {
                                async offset() {
                                  return [{
                                    createdAt: new Date("2026-04-01T10:00:00.000Z"),
                                    email: "jane@example.com",
                                    firstName: "Jane",
                                    id: "user-1",
                                    clerkUserId: "user_clerk_jane",
                                    isPlatformAdmin: true,
                                    lastName: "Doe",
                                    updatedAt: new Date("2026-04-15T09:30:00.000Z"),
                                  }, {
                                    createdAt: new Date("2026-03-01T10:00:00.000Z"),
                                    email: "alex@example.com",
                                    firstName: "Alex",
                                    id: "user-2",
                                    clerkUserId: "user_clerk_alex",
                                    isPlatformAdmin: false,
                                    lastName: null,
                                    updatedAt: new Date("2026-04-12T09:30:00.000Z"),
                                  }];
                                },
                              };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            }

            throw new Error("Unexpected select call.");
          },
        } as never;
      },
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback(this.getDatabase());
      },
    };
  }
}

type AdminSqlMock = <T>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>;

test("GraphQL PlatformAdminUsers query lists paginated users for platform admins", async () => {
  const app = Fastify();
  const config = PlatformAdminUsersQueryTestHarness.createConfigMock();
  const database = PlatformAdminUsersQueryTestHarness.createDatabaseMock();
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      return {
        token: "jwt-token",
        user: {
          id: "user-123",
          email: "admin@example.com",
          firstName: "Admin",
          lastName: "User",
          provider: "clerk" as const,
          providerSubject: "user_clerk_123",
        },
        company: {
          id: "company-123",
          name: "Example Org",
        },
      };
    },
  };

  await GraphqlApplication.fromResolvers(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
    new RefreshModelProviderCredentialModelsMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialModelsQueryResolver(),
    new ModelProviderCredentialsQueryResolver(),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        query PlatformAdminUsers {
          PlatformAdminUsers(page: 1, pageSize: 25, search: "user_clerk") {
            page
            pageSize
            totalCount
            totalPages
            nodes {
              id
              clerkUserId
              email
              firstName
              lastName
              isPlatformAdmin
              createdAt
              updatedAt
            }
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.PlatformAdminUsers, {
    nodes: [{
      id: "user-1",
      clerkUserId: "user_clerk_jane",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      isPlatformAdmin: true,
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-04-15T09:30:00.000Z",
    }, {
      id: "user-2",
      clerkUserId: "user_clerk_alex",
      email: "alex@example.com",
      firstName: "Alex",
      lastName: null,
      isPlatformAdmin: false,
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-04-12T09:30:00.000Z",
    }],
    page: 1,
    pageSize: 25,
    totalCount: 2,
    totalPages: 1,
  });

  await app.close();
});

test("GraphQL PlatformAdminUser query lists a user's company memberships for platform admins", async () => {
  const app = Fastify();
  const config = PlatformAdminUsersQueryTestHarness.createConfigMock();
  let selectCallCount = 0;
  const database = {
    getDatabase() {
      return {
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
                      async limit() {
                        return [{ userId: "user-123" }];
                      },
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
                      async limit() {
                        return [{
                          clerkUserId: "user_clerk_jane",
                          createdAt: new Date("2026-04-01T10:00:00.000Z"),
                          email: "jane@example.com",
                          firstName: "Jane",
                          id: "user-1",
                          isPlatformAdmin: true,
                          lastName: "Doe",
                          updatedAt: new Date("2026-04-15T09:30:00.000Z"),
                        }];
                      },
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
                  innerJoin() {
                    return {
                      where() {
                        return {
                          async orderBy() {
                            return [{
                              companyId: "company-1",
                              companyName: "Acme",
                              companyPlan: "pro",
                              companySlug: "acme",
                              createdAt: new Date("2026-04-03T10:00:00.000Z"),
                              role: "admin",
                              status: "active",
                              updatedAt: new Date("2026-04-04T10:00:00.000Z"),
                            }, {
                              companyId: "company-2",
                              companyName: "Beta",
                              companyPlan: "free",
                              companySlug: null,
                              createdAt: new Date("2026-04-05T10:00:00.000Z"),
                              role: "member",
                              status: "invited",
                              updatedAt: new Date("2026-04-06T10:00:00.000Z"),
                            }];
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          }

          throw new Error("Unexpected select call.");
        },
      } as never;
    },
    async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
      return callback(this.getDatabase());
    },
  };
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      return {
        token: "jwt-token",
        user: {
          id: "user-123",
          email: "admin@example.com",
          firstName: "Admin",
          lastName: "User",
          provider: "clerk" as const,
          providerSubject: "user_clerk_123",
        },
        company: {
          id: "company-123",
          name: "Example Org",
        },
      };
    },
  };

  await GraphqlApplication.fromResolvers(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
    new RefreshModelProviderCredentialModelsMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database as never),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialModelsQueryResolver(),
    new ModelProviderCredentialsQueryResolver(),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        query PlatformAdminUser {
          PlatformAdminUser(id: "user-1") {
            id
            clerkUserId
            email
            firstName
            lastName
            isPlatformAdmin
            createdAt
            updatedAt
            companyMemberships {
              companyId
              companyName
              companySlug
              companyPlan
              role
              status
              createdAt
              updatedAt
            }
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.PlatformAdminUser, {
    id: "user-1",
    clerkUserId: "user_clerk_jane",
    email: "jane@example.com",
    firstName: "Jane",
    lastName: "Doe",
    isPlatformAdmin: true,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-15T09:30:00.000Z",
    companyMemberships: [{
      companyId: "company-1",
      companyName: "Acme",
      companySlug: "acme",
      companyPlan: "pro",
      role: "admin",
      status: "active",
      createdAt: "2026-04-03T10:00:00.000Z",
      updatedAt: "2026-04-04T10:00:00.000Z",
    }, {
      companyId: "company-2",
      companyName: "Beta",
      companySlug: null,
      companyPlan: "free",
      role: "member",
      status: "invited",
      createdAt: "2026-04-05T10:00:00.000Z",
      updatedAt: "2026-04-06T10:00:00.000Z",
    }],
  });

  await app.close();
});

test("PlatformAdminUser query serializes string timestamps from the admin database", async () => {
  const sqlMock = (async <T>(strings: TemplateStringsArray): Promise<T> => {
    const query = strings.join("?").replace(/\s+/g, " ").trim();
    if (query.includes("FROM users")) {
      return [{
        clerkUserId: "user_clerk_jane",
        createdAt: "2026-04-01T10:00:00.000Z",
        email: "jane@example.com",
        firstName: "Jane",
        id: "user-1",
        isPlatformAdmin: true,
        lastName: "Doe",
        updatedAt: "2026-04-15T09:30:00.000Z",
      }] as T;
    }

    return [{
      companyId: "company-1",
      companyName: "Acme",
      companyPlan: "pro",
      companySlug: "acme",
      createdAt: "2026-04-03T10:00:00.000Z",
      role: "admin",
      status: "active",
      updatedAt: "2026-04-04T10:00:00.000Z",
    }] as T;
  }) as AdminSqlMock;
  const resolver = new PlatformAdminUsersQueryResolver({
    getSqlClient() {
      return sqlMock;
    },
  } as never);

  const result = await resolver.executeUser(
    null,
    {
      id: "user-1",
    },
    {
      app_runtime_transaction_provider: {
        async transaction() {
          throw new Error("Admin database path should not use app runtime transactions.");
        },
      },
      authSession: {
        token: "jwt-token",
        user: {
          email: "admin@example.com",
          firstName: "Admin",
          id: "admin-user",
          lastName: "User",
          provider: "clerk",
          providerSubject: "user_clerk_admin",
        },
      },
      isPlatformAdmin: true,
      resolveSubscriptionContext: null,
    } as GraphqlRequestContext,
  );

  assert.equal(result.createdAt, "2026-04-01T10:00:00.000Z");
  assert.equal(result.updatedAt, "2026-04-15T09:30:00.000Z");
  assert.deepEqual(result.companyMemberships, [{
    companyId: "company-1",
    companyName: "Acme",
    companyPlan: "pro",
    companySlug: "acme",
    createdAt: "2026-04-03T10:00:00.000Z",
    role: "admin",
    status: "active",
    updatedAt: "2026-04-04T10:00:00.000Z",
  }]);
});

test("GraphQL PlatformAdminUsers query rejects non-platform-admin users", async () => {
  const app = Fastify();
  const config = PlatformAdminUsersQueryTestHarness.createConfigMock();
  const database = PlatformAdminUsersQueryTestHarness.createDatabaseMock(false);
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      return {
        token: "jwt-token",
        user: {
          id: "user-123",
          email: "user@example.com",
          firstName: "User",
          lastName: "Example",
          provider: "clerk" as const,
          providerSubject: "user_clerk_123",
        },
        company: {
          id: "company-123",
          name: "Example Org",
        },
      };
    },
  };

  await GraphqlApplication.fromResolvers(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
    new RefreshModelProviderCredentialModelsMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialModelsQueryResolver(),
    new ModelProviderCredentialsQueryResolver(),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        query PlatformAdminUsers {
          PlatformAdminUsers(page: 1, pageSize: 25) {
            totalCount
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.data, null);
  assert.equal(document.errors?.[0]?.message, "Platform admin access required.");

  await app.close();
});
