import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import type { ModelProviderModel } from "../src/services/model_service.js";

class AddModelProviderCredentialMutationTestHarness {
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
    const insertedValues: Array<Record<string, unknown>> = [];
    const scopedCompanyIds: string[] = [];

    return {
      insertedValues,
      scopedCompanyIds,
      getDatabase() {
        return {
          insert() {
            return {
              values(value: Record<string, unknown> | Array<Record<string, unknown>>) {
                const values = Array.isArray(value) ? value : [value];
                insertedValues.push(...values);
                return {
                  async returning() {
                    const credentialValue = values[0] ?? {};
                    return [{
                      id: "credential-1",
                      companyId: String(credentialValue.companyId),
                      name: String(credentialValue.name),
                      modelProvider: credentialValue.modelProvider,
                      type: credentialValue.type,
                      refreshToken: credentialValue.refreshToken ?? null,
                      refreshedAt: credentialValue.refreshedAt ?? null,
                      createdAt: credentialValue.createdAt,
                      updatedAt: credentialValue.updatedAt,
                    }];
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

test("GraphQL AddModelProviderCredential mutation uses the authenticated company from the bearer token", async () => {
  const app = Fastify();
  const config = AddModelProviderCredentialMutationTestHarness.createConfigMock();
  const database = AddModelProviderCredentialMutationTestHarness.createDatabaseMock();
  const modelManager = {
    calls: [] as Array<{ provider: string; apiKey: string }>,
    async fetchModels(provider: string, apiKey: string): Promise<ModelProviderModel[]> {
      this.calls.push({
        provider,
        apiKey,
      });
      return [{
        name: "gpt-test",
        reasoningLevels: ["low", "medium"],
      }];
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

  await new GraphqlApplication(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
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
        mutation AddModelProviderCredential($input: AddModelProviderCredentialInput!) {
          AddModelProviderCredential(input: $input) {
            id
            companyId
            name
            modelProvider
            type
            refreshToken
            createdAt
            updatedAt
          }
        }
      `,
      variables: {
        input: {
          modelProvider: "openai",
          apiKey: "secret-value",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.AddModelProviderCredential, {
    id: "credential-1",
    companyId: "company-123",
    name: "OpenAI / Codex",
    modelProvider: "openai",
    type: "api_key",
    refreshToken: null,
    createdAt: document.data.AddModelProviderCredential.createdAt,
    updatedAt: document.data.AddModelProviderCredential.updatedAt,
  });
  assert.match(
    document.data.AddModelProviderCredential.createdAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );
  assert.match(
    document.data.AddModelProviderCredential.updatedAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );
  assert.equal(database.insertedValues.length, 2);
  assert.equal(database.insertedValues[0]?.companyId, "company-123");
  assert.equal(database.insertedValues[0]?.encryptedApiKey, "secret-value");
  assert.equal(database.insertedValues[1]?.modelProviderCredentialId, "credential-1");
  assert.equal(database.insertedValues[1]?.name, "gpt-test");
  assert.deepEqual(database.insertedValues[1]?.reasoningLevels, ["low", "medium"]);
  assert.deepEqual(modelManager.calls, [{
    provider: "openai",
    apiKey: "secret-value",
  }]);
  assert.deepEqual(database.scopedCompanyIds, ["company-123"]);

  await app.close();
});
