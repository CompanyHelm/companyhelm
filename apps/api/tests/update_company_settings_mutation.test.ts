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

class UpdateCompanySettingsMutationTestHarness {
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
    let selectCallCount = 0;

    return {
      insertedValues,
      getDatabase() {
        return {
          select() {
            selectCallCount += 1;

            return {
              from() {
                return {
                  async where() {
                    if (selectCallCount === 1) {
                      return [];
                    }

                    throw new Error(`Unexpected select call: ${selectCallCount}`);
                  },
                };
              },
            };
          },
          insert() {
            return {
              values(value: Record<string, unknown>) {
                insertedValues.push(value);

                return {
                  async returning() {
                    return [{
                      companyId: String(value.companyId),
                      baseSystemPrompt: value.base_system_prompt ?? null,
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

test("GraphQL UpdateCompanySettings mutation creates the persisted company prompt layer", async () => {
  const app = Fastify();
  const config = UpdateCompanySettingsMutationTestHarness.createConfigMock();
  const database = UpdateCompanySettingsMutationTestHarness.createDatabaseMock();
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

  await new GraphqlApplication(
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
        mutation UpdateCompanySettings($input: UpdateCompanySettingsInput!) {
          UpdateCompanySettings(input: $input) {
            companyId
            baseSystemPrompt
          }
        }
      `,
      variables: {
        input: {
          baseSystemPrompt: "Always use company terminology before agent-specific wording.",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.UpdateCompanySettings, {
    companyId: "company-123",
    baseSystemPrompt: "Always use company terminology before agent-specific wording.",
  });
  assert.deepEqual(database.insertedValues, [{
    companyId: "company-123",
    base_system_prompt: "Always use company terminology before agent-specific wording.",
  }]);

  await app.close();
});
