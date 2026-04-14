import "reflect-metadata";
import { generateKeyPairSync } from "node:crypto";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { modelProviderCredentialModels, modelProviderCredentials } from "../src/db/schema.ts";
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

const TEST_PRIVATE_KEY_PEM = (() => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs1", format: "pem" }).toString();
})();

class AddModelProviderCredentialMutationTestHarness {
  static createConfigMock(): Config {
    return {
      auth: {
        provider: "clerk",
        clerk: {
          secret_key: "clerk-secret",
          publishable_key: "clerk-publishable",
          jwks_url: "https://example.com/.well-known/jwks.json",
          authorized_parties: ["http://localhost:3000"],
        },
      },
      companyhelm: {
        e2b: {
          api_key: "e2b-test-key",
          desktop_resolution: {
            height: 900,
            width: 1440,
          },
          template_prefix: "companyhelm-test",
        },
      },
      cors: {
        origin: "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST"],
        allowed_headers: ["authorization", "content-type"],
      },
      database: {
        host: "127.0.0.1",
        name: "companyhelm_test",
        port: 5432,
        roles: {
          admin: {
            password: "postgres",
            username: "postgres",
          },
          app_runtime: {
            password: "postgres",
            username: "postgres",
          },
        },
      },
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      github: {
        app_client_id: "Iv-test-local",
        app_client_secret: "github-test-secret",
        app_link: "https://github.com/apps/companyhelm-test",
        app_private_key_pem: TEST_PRIVATE_KEY_PEM,
      },
      host: "127.0.0.1",
      log: {
        json: false,
        level: "info",
      },
      port: 4000,
      publicUrl: "http://localhost:4000",
      redis: {
        host: "127.0.0.1",
        password: "",
        port: 6379,
        username: "",
      },
      security: {
        encryption: {
          key: "companyhelm-test-encryption-key",
          key_id: "companyhelm-test-key",
        },
      },
      web_search: {
        exa: {
          api_key: "exa-test-key",
        },
      },
      workers: {
        session_process: {
          concurrency: 1,
        },
      },
    } as Config;
  }

  static createDatabaseMock() {
    const insertedValues: Array<Record<string, unknown>> = [];
    const scopedCompanyIds: string[] = [];
    const credentialRows: Array<Record<string, unknown>> = [];
    const modelRows: Array<Record<string, unknown>> = [];
    let credentialUpdateCount = 0;
    let modelUpdateCount = 0;

    return {
      insertedValues,
      scopedCompanyIds,
      getDatabase() {
        return {
          select() {
            return {
              from(table: unknown) {
                return {
                  async where() {
                    if (table === modelProviderCredentials) {
                      return [...credentialRows];
                    }
                    if (table === modelProviderCredentialModels) {
                      return [...modelRows];
                    }

                    return [];
                  },
                };
              },
            };
          },
          insert() {
            return {
              values(value: Record<string, unknown> | Array<Record<string, unknown>>) {
                const values = Array.isArray(value) ? value : [value];
                insertedValues.push(...values);
                if (values[0] && "modelProvider" in values[0]) {
                  credentialRows.push({
                    ...values[0],
                    id: "credential-1",
                  });
                }
                if (values[0] && "modelProviderCredentialId" in values[0]) {
                  modelRows.push(...values.map((entry, index) => ({
                    ...entry,
                    id: `model-row-${index + 1}`,
                  })));
                }
                return {
                  async returning() {
                    const credentialValue = values[0] ?? {};
                    return [{
                      id: "credential-1",
                      companyId: String(credentialValue.companyId),
                      name: String(credentialValue.name),
                      modelProvider: credentialValue.modelProvider,
                      type: credentialValue.type,
                      status: credentialValue.status ?? "active",
                      errorMessage: credentialValue.errorMessage ?? null,
                      isDefault: Boolean(credentialValue.isDefault),
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
          update(table: unknown) {
            return {
              set(value: Record<string, unknown>) {
                return {
                  async where() {
                    if (table === modelProviderCredentials && "isDefault" in value) {
                      credentialUpdateCount += 1;
                      credentialRows.forEach((row) => {
                        row.isDefault = credentialUpdateCount === 2;
                      });
                    }
                    if (table === modelProviderCredentialModels && "isDefault" in value) {
                      modelUpdateCount += 1;
                      modelRows.forEach((row) => {
                        row.isDefault = modelUpdateCount === 2;
                      });
                    }
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
        provider: "openai",
        modelId: "gpt-5.4",
        name: "GPT-5.4",
        description: "Latest frontier agentic coding model.",
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
        mutation AddModelProviderCredential($input: AddModelProviderCredentialInput!) {
          AddModelProviderCredential(input: $input) {
            id
            companyId
            name
            modelProvider
            type
            status
            errorMessage
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
    name: "OpenAI",
    modelProvider: "openai",
    type: "api_key",
    status: "active",
    errorMessage: null,
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
  assert.equal(database.insertedValues[0]?.status, "active");
  assert.equal(database.insertedValues[0]?.errorMessage, null);
  assert.equal(database.insertedValues[1]?.modelProviderCredentialId, "credential-1");
  assert.equal(database.insertedValues[1]?.modelId, "gpt-5.4");
  assert.equal(database.insertedValues[1]?.name, "GPT-5.4");
  assert.equal(database.insertedValues[1]?.description, "Latest frontier agentic coding model.");
  assert.deepEqual(database.insertedValues[1]?.reasoningLevels, ["low", "medium"]);
  assert.deepEqual(modelManager.calls, [{
    provider: "openai",
    apiKey: "secret-value",
  }]);
  assert.deepEqual(database.scopedCompanyIds, ["company-123"]);

  await app.close();
});

test("GraphQL AddModelProviderCredential mutation stores the provided credential name when present", async () => {
  const app = Fastify();
  const config = AddModelProviderCredentialMutationTestHarness.createConfigMock();
  const database = AddModelProviderCredentialMutationTestHarness.createDatabaseMock();
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
        mutation AddModelProviderCredential($input: AddModelProviderCredentialInput!) {
          AddModelProviderCredential(input: $input) {
            id
            name
          }
        }
      `,
      variables: {
        input: {
          modelProvider: "openai",
          name: "Primary OpenAI Key",
          apiKey: "secret-value",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.data.AddModelProviderCredential.name, "Primary OpenAI Key");
  assert.equal(database.insertedValues[0]?.name, "Primary OpenAI Key");

  await app.close();
});

test("GraphQL AddModelProviderCredential mutation supports anthropic credentials", async () => {
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
        mutation AddModelProviderCredential($input: AddModelProviderCredentialInput!) {
          AddModelProviderCredential(input: $input) {
            id
            name
            modelProvider
          }
        }
      `,
      variables: {
        input: {
          modelProvider: "anthropic",
          apiKey: "anthropic-secret",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.data.AddModelProviderCredential.name, "Anthropic");
  assert.equal(document.data.AddModelProviderCredential.modelProvider, "anthropic");
  assert.equal(database.insertedValues[0]?.modelProvider, "anthropic");
  assert.equal(database.insertedValues[0]?.name, "Anthropic");
  assert.deepEqual(modelManager.calls, [{
    provider: "anthropic",
    apiKey: "anthropic-secret",
  }]);

  await app.close();
});

test("GraphQL AddModelProviderCredential mutation supports openai-codex oauth credentials", async () => {
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
        mutation AddModelProviderCredential($input: AddModelProviderCredentialInput!) {
          AddModelProviderCredential(input: $input) {
            id
            name
            modelProvider
            type
            status
            errorMessage
            refreshToken
          }
        }
      `,
      variables: {
        input: {
          modelProvider: "openai-codex",
          accessToken: "oauth-access-token",
          refreshToken: "oauth-refresh-token",
          accessTokenExpiresAtMilliseconds: "1775358352922",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.AddModelProviderCredential, {
    id: "credential-1",
    name: "OpenAI Codex",
    modelProvider: "openai-codex",
    type: "oauth_token",
    status: "active",
    errorMessage: null,
    refreshToken: "oauth-refresh-token",
  });
  assert.equal(database.insertedValues[0]?.modelProvider, "openai-codex");
  assert.equal(database.insertedValues[0]?.type, "oauth_token");
  assert.equal(database.insertedValues[0]?.status, "active");
  assert.equal(database.insertedValues[0]?.errorMessage, null);
  assert.equal(database.insertedValues[0]?.encryptedApiKey, "oauth-access-token");
  assert.equal(database.insertedValues[0]?.refreshToken, "oauth-refresh-token");
  assert.ok(database.insertedValues[0]?.accessTokenExpiresAt instanceof Date);
  assert.deepEqual(modelManager.calls, [{
    provider: "openai-codex",
    apiKey: "oauth-access-token",
  }]);

  await app.close();
});
