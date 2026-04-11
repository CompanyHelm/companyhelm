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

class DeleteModelProviderCredentialMutationTestHarness {
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
    const deletedRows: Array<Record<string, unknown>> = [];

    return {
      deletedRows,
      getDatabase() {
        return {
          delete() {
            return {
              where() {
                return {
                  async returning() {
                    const deleted = {
                      id: "credential-1",
                      companyId: "company-123",
                      name: "OpenAI / Codex",
                      modelProvider: "openai",
                      type: "api_key",
                      refreshToken: null,
                      refreshedAt: null,
                      createdAt: new Date("2026-03-20T10:00:00.000Z"),
                      updatedAt: new Date("2026-03-20T10:00:00.000Z"),
                    };
                    deletedRows.push(deleted);
                    return [deleted];
                  },
                };
              },
            };
          },
        } as never;
      },
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback(this.getDatabase());
      },
    };
  }
}

test("GraphQL DeleteModelProviderCredential mutation deletes a credential", async () => {
  const app = Fastify();
  const config = DeleteModelProviderCredentialMutationTestHarness.createConfigMock();
  const database = DeleteModelProviderCredentialMutationTestHarness.createDatabaseMock();
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
        mutation DeleteModelProviderCredential($input: DeleteModelProviderCredentialInput!) {
          DeleteModelProviderCredential(input: $input) {
            id
            companyId
            name
          }
        }
      `,
      variables: {
        input: {
          id: "credential-1",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.DeleteModelProviderCredential, {
    id: "credential-1",
    companyId: "company-123",
    name: "OpenAI / Codex",
  });
  assert.equal(database.deletedRows.length, 1);

  await app.close();
});
