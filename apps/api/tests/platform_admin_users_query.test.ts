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
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

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

  static createDatabaseMock() {
    let selectCallCount = 0;

    return {
      getDatabase() {
        return {
          select() {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                from() {
                  return [{
                    totalCount: 2,
                  }];
                },
              };
            }

            if (selectCallCount === 2) {
              return {
                from() {
                  return {
                    groupBy() {
                      return {
                        as() {
                          return {
                            companyCount: "companyCount",
                            userId: "userId",
                          };
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
                    leftJoin() {
                      return {
                        orderBy() {
                          return {
                            limit() {
                              return {
                                async offset() {
                                  return [{
                                    companyCount: 2,
                                    createdAt: new Date("2026-04-01T10:00:00.000Z"),
                                    email: "jane@example.com",
                                    firstName: "Jane",
                                    id: "user-1",
                                    isPlatformAdmin: true,
                                    lastName: "Doe",
                                    updatedAt: new Date("2026-04-15T09:30:00.000Z"),
                                  }, {
                                    companyCount: 1,
                                    createdAt: new Date("2026-03-01T10:00:00.000Z"),
                                    email: "alex@example.com",
                                    firstName: "Alex",
                                    id: "user-2",
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
          isPlatformAdmin: true,
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
          PlatformAdminUsers(page: 1, pageSize: 25) {
            page
            pageSize
            totalCount
            totalPages
            nodes {
              id
              email
              firstName
              lastName
              isPlatformAdmin
              companyCount
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
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      isPlatformAdmin: true,
      companyCount: 2,
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-04-15T09:30:00.000Z",
    }, {
      id: "user-2",
      email: "alex@example.com",
      firstName: "Alex",
      lastName: null,
      isPlatformAdmin: false,
      companyCount: 1,
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

test("GraphQL PlatformAdminUsers query rejects non-platform-admin users", async () => {
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
          email: "user@example.com",
          firstName: "User",
          isPlatformAdmin: false,
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
