import "reflect-metadata";
import { generateKeyPairSync } from "node:crypto";
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

const TEST_PRIVATE_KEY_PEM = (() => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs1", format: "pem" }).toString();
})();

class ModelProviderCredentialsQueryTestHarness {
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
    const credentialRows = [{
      id: "credential-1",
      companyId: "company-123",
      isDefault: true,
      name: "OpenAI / Codex",
      modelProvider: "openai",
      type: "api_key",
      status: "active",
      errorMessage: null,
      refreshToken: null,
      refreshedAt: null,
      createdAt: new Date("2026-03-20T10:00:00.000Z"),
      updatedAt: new Date("2026-03-20T10:00:00.000Z"),
    }];
    const modelRows = [{
      isDefault: true,
      modelId: "gpt-5.4",
      modelProviderCredentialId: "credential-1",
      reasoningLevels: ["low", "medium", "high"],
    }];
    const scopedCompanyIds: string[] = [];
    let selectCallCount = 0;

    return {
      scopedCompanyIds,
      getDatabase() {
        return {
          select() {
            selectCallCount += 1;
            return {
              from() {
                return {
                  async where() {
                    return selectCallCount === 1 ? credentialRows : modelRows;
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
        query ModelProviderCredentials {
          ModelProviderCredentials {
            id
            companyId
            isDefault
            name
            modelProvider
            defaultModelId
            defaultReasoningLevel
            type
            status
            errorMessage
            refreshedAt
            createdAt
            updatedAt
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
    isDefault: true,
    name: "OpenAI / Codex",
    modelProvider: "openai",
    defaultModelId: "gpt-5.4",
    defaultReasoningLevel: "high",
    type: "api_key",
    status: "active",
    errorMessage: null,
    refreshedAt: null,
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
  }]);
  assert.deepEqual(database.scopedCompanyIds, ["company-123"]);

  await app.close();
});

test("GraphQL ModelProviderCredentials query rejects unauthenticated requests", async () => {
  const app = Fastify();
  const config = ModelProviderCredentialsQueryTestHarness.createConfigMock();
  const database = ModelProviderCredentialsQueryTestHarness.createDatabaseMock();
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      throw new Error("unused");
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
