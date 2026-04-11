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

class CreateSecretMutationTestHarness {
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
    const insertedValues: Array<Record<string, unknown>> = [];

    return {
      insertedValues,
      getDatabase() {
        return {
          insert() {
            return {
              values(value: Record<string, unknown>) {
                insertedValues.push(value);
                return {
                  async returning() {
                    return [{
                      companyId: String(value.companyId),
                      createdAt: value.createdAt as Date,
                      description: value.description as string | null,
                      envVarName: String(value.envVarName),
                      id: "secret-1",
                      name: String(value.name),
                      updatedAt: value.updatedAt as Date,
                    }];
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

test("GraphQL CreateSecret mutation encrypts the value and defaults the env var name", async () => {
  const app = Fastify();
  const config = CreateSecretMutationTestHarness.createConfigMock();
  const encryptionService = new SecretEncryptionService(config);
  const database = CreateSecretMutationTestHarness.createDatabaseMock();
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
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        mutation CreateSecret($input: CreateSecretInput!) {
          CreateSecret(input: $input) {
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
          description: "Main production key",
          name: "api key primary",
          value: "line one\nline two\n",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.CreateSecret, {
    id: "secret-1",
    companyId: "company-123",
    name: "api key primary",
    description: "Main production key",
    envVarName: "API_KEY_PRIMARY",
    createdAt: document.data.CreateSecret.createdAt,
    updatedAt: document.data.CreateSecret.updatedAt,
  });

  const [insertedSecret] = database.insertedValues;
  assert.equal(insertedSecret?.companyId, "company-123");
  assert.equal(insertedSecret?.createdByUserId, "user-123");
  assert.equal(insertedSecret?.updatedByUserId, "user-123");
  assert.equal(insertedSecret?.envVarName, "API_KEY_PRIMARY");
  assert.equal(insertedSecret?.encryptionKeyId, "companyhelm-test-key");
  assert.notEqual(insertedSecret?.encryptedValue, "line one\nline two\n");
  assert.equal(
    encryptionService.decrypt(
      String(insertedSecret?.encryptedValue),
      String(insertedSecret?.encryptionKeyId),
    ),
    "line one\nline two\n",
  );

  await app.close();
});
