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
import { SecretEncryptionService } from "../src/services/secrets/encryption.ts";

class UpdateSecretMutationTestHarness {
  static createConfigMock(): Config {
    return {
      auth: {
        provider: "clerk",
      },
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      log: {
        json: false,
        level: "info",
      },
      security: {
        encryption: {
          key: "companyhelm-test-encryption-key",
          key_id: "companyhelm-test-key",
        },
      },
    } as Config;
  }

  static createDatabaseMock() {
    const existingSecret = {
      companyId: "company-123",
      createdAt: new Date("2026-03-30T18:00:00.000Z"),
      description: "Current GitHub token",
      envVarName: "GITHUB_TOKEN",
      id: "secret-1",
      name: "github token",
      updatedAt: new Date("2026-03-30T18:00:00.000Z"),
    };
    const updatedValues: Array<Record<string, unknown>> = [];

    return {
      updatedValues,
      getDatabase() {
        return {
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [existingSecret];
                  },
                };
              },
            };
          },
          update() {
            return {
              set(value: Record<string, unknown>) {
                updatedValues.push(value);
                return {
                  where() {
                    return {
                      async returning() {
                        return [{
                          companyId: existingSecret.companyId,
                          createdAt: existingSecret.createdAt,
                          description: existingSecret.description,
                          envVarName: String(value.envVarName ?? existingSecret.envVarName),
                          id: existingSecret.id,
                          name: String(value.name ?? existingSecret.name),
                          updatedAt: value.updatedAt as Date,
                        }];
                      },
                    };
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

test("GraphQL UpdateSecret mutation rotates encrypted values without exposing plaintext", async () => {
  const app = Fastify();
  const config = UpdateSecretMutationTestHarness.createConfigMock();
  const encryptionService = new SecretEncryptionService(config);
  const database = UpdateSecretMutationTestHarness.createDatabaseMock();
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      return {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk" as const,
          providerSubject: "user_clerk_123",
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
    headers: {
      authorization: "Bearer jwt-token",
    },
    method: "POST",
    payload: {
      query: `
        mutation UpdateSecret($input: UpdateSecretInput!) {
          UpdateSecret(input: $input) {
            id
            companyId
            name
            description
            envVarName
            createdAt
            updatedAt
          }
        }
      `,
      variables: {
        input: {
          envVarName: "GITHUB_APP_TOKEN",
          id: "secret-1",
          name: "github app token",
          value: "rotated\nmultiline\nsecret\n",
        },
      },
    },
    url: "/graphql",
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.UpdateSecret, {
    companyId: "company-123",
    createdAt: "2026-03-30T18:00:00.000Z",
    description: "Current GitHub token",
    envVarName: "GITHUB_APP_TOKEN",
    id: "secret-1",
    name: "github app token",
    updatedAt: document.data.UpdateSecret.updatedAt,
  });

  const [updatedSecret] = database.updatedValues;
  assert.equal(updatedSecret?.name, "github app token");
  assert.equal(updatedSecret?.envVarName, "GITHUB_APP_TOKEN");
  assert.equal(updatedSecret?.updatedByUserId, "user-123");
  assert.equal(updatedSecret?.encryptionKeyId, "companyhelm-test-key");
  assert.notEqual(updatedSecret?.encryptedValue, "rotated\nmultiline\nsecret\n");
  assert.equal(
    encryptionService.decrypt(
      String(updatedSecret?.encryptedValue),
      String(updatedSecret?.encryptionKeyId),
    ),
    "rotated\nmultiline\nsecret\n",
  );

  await app.close();
});
