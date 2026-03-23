import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { ConfigDocument } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlAppRuntimeDatabase } from "../src/graphql/graphql_app_runtime_database.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";

class ModelProviderCredentialsQueryTestHarness {
  static createConfigMock(): ConfigDocument {
    return {
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      auth: {
        provider: "clerk",
      },
    } as ConfigDocument;
  }

  static createDatabaseMock() {
    const rows = [{
      id: "credential-1",
      companyId: "company-123",
      name: "OpenAI / Codex",
      modelProvider: "openai",
      type: "api_key",
      refreshToken: null,
      refreshedAt: null,
      createdAt: new Date("2026-03-20T10:00:00.000Z"),
      updatedAt: new Date("2026-03-20T10:00:00.000Z"),
    }];
    const scopedCompanyIds: string[] = [];

    return {
      scopedCompanyIds,
      getDatabase() {
        return {
          select() {
            return {
              from() {
                return {
                  async where() {
                    return rows;
                  },
                };
              },
            };
          },
        } as never;
      },
      async withCompanyContext(companyId: string, callback: (database: unknown) => Promise<unknown>) {
        scopedCompanyIds.push(companyId);
        return callback(this.getDatabase());
      },
    };
  }
}

test("GraphQL ModelProviderCredentials query lists credentials for the authenticated company", async () => {
  const app = Fastify();
  const config = ModelProviderCredentialsQueryTestHarness.createConfigMock();
  const database = ModelProviderCredentialsQueryTestHarness.createDatabaseMock();
  const graphqlDatabase = new GraphqlAppRuntimeDatabase(database as never);
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

  await new GraphqlApplication(
    config,
    new AddModelProviderCredentialMutation(graphqlDatabase),
    new GraphqlRequestContextResolver(authProvider as never, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialsQueryResolver(graphqlDatabase),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        query ModelProviderCredentials {
          ModelProviderCredentials {
            id
            companyId
            name
            modelProvider
            type
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.ModelProviderCredentials, [{
    id: "credential-1",
    companyId: "company-123",
    name: "OpenAI / Codex",
    modelProvider: "openai",
    type: "api_key",
  }]);
  assert.deepEqual(database.scopedCompanyIds, ["company-123"]);

  await app.close();
});

test("GraphQL ModelProviderCredentials query rejects unauthenticated requests", async () => {
  const app = Fastify();
  const config = ModelProviderCredentialsQueryTestHarness.createConfigMock();
  const database = ModelProviderCredentialsQueryTestHarness.createDatabaseMock();
  const graphqlDatabase = new GraphqlAppRuntimeDatabase(database as never);
  const authProvider = {
    async authenticateBearerToken() {
      throw new Error("unused");
    },
  };

  await new GraphqlApplication(
    config,
    new AddModelProviderCredentialMutation(graphqlDatabase),
    new GraphqlRequestContextResolver(authProvider as never, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialsQueryResolver(graphqlDatabase),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    payload: {
      query: `
        query ModelProviderCredentials {
          ModelProviderCredentials {
            id
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.data, null);
  assert.equal(document.errors?.[0]?.message, "Authentication required.");

  await app.close();
});
