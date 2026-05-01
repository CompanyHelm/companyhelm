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

class AgentCreateOptionsQueryTestHarness {
  static createConfigMock(): Config {
    return {
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      auth: {
        provider: "clerk",
      },
      log: {
        json: false,
        level: "info",
      },
    } as Config;
  }

  static createDatabaseMock(input?: {
    platformModelRecords?: Array<Record<string, unknown>>;
    platformRouteRecords?: Array<Record<string, unknown>>;
    managedProviderSettingsRecords?: Array<Record<string, unknown>>;
    defaultProviderSelectionRecords?: Array<Record<string, unknown>>;
    credentialRecords?: Array<Record<string, unknown>>;
    modelRecords?: Array<Record<string, unknown>>;
  }) {
    let selectCallCount = 0;
    const selectResults = [
      [],
      input?.platformModelRecords ?? [],
      input?.platformRouteRecords ?? [],
      input?.managedProviderSettingsRecords ?? [],
      input?.defaultProviderSelectionRecords ?? [{
        modelCredentialSource: "user_provided",
        modelProviderCredentialId: "credential-1",
      }],
      input?.credentialRecords ?? [{
        id: "credential-1",
        modelProvider: "openai",
        name: "OpenAI / Codex",
      }],
      input?.modelRecords ?? [{
        id: "model-row-1",
        isDefault: true,
        modelProviderCredentialId: "credential-1",
        modelId: "gpt-5.4",
        name: "GPT-5.4",
        description: "Latest frontier agentic coding model.",
        reasoningSupported: true,
        reasoningLevels: ["low", "medium", "high"],
      }],
    ];

    return {
      getDatabase() {
        return {
          async execute() {
            return [];
          },
          select() {
            selectCallCount += 1;
            const selectResult = selectResults[selectCallCount - 1];
            if (selectResult) {
              return {
                from() {
                  return {
                    where() {
                      return selectCallCount === 1
                        ? { async limit() { return selectResult; } }
                        : selectResult;
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

test("GraphQL AgentCreateOptions query groups provider credentials with their models", async () => {
  const app = Fastify();
  const config = AgentCreateOptionsQueryTestHarness.createConfigMock();
  const database = AgentCreateOptionsQueryTestHarness.createDatabaseMock();
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
        query AgentCreateOptions {
          AgentCreateOptions {
            id
            modelCredentialSource
            platformModelProviderCredentialId
            modelProviderCredentialId
            isDefault
            label
            modelProvider
            defaultModelId
            defaultLlmModelId
            defaultReasoningLevel
            models {
              id
              modelCredentialSource
              llmModelId
              platformModelProviderCredentialModelId
              modelProviderCredentialModelId
              modelId
              name
              description
              reasoningSupported
              reasoningLevels
            }
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.errors, undefined);
  assert.deepEqual(document.data.AgentCreateOptions, [{
    id: "agent-create-provider-option:credential-1",
    modelCredentialSource: "user_provided",
    platformModelProviderCredentialId: null,
    modelProviderCredentialId: "credential-1",
    isDefault: true,
    label: "OpenAI / Codex",
    modelProvider: "openai",
    defaultModelId: "gpt-5.4",
    defaultLlmModelId: "model-row-1",
    defaultReasoningLevel: "high",
    models: [{
      id: "agent-create-model-option:model-row-1",
      modelCredentialSource: "user_provided",
      llmModelId: "model-row-1",
      platformModelProviderCredentialModelId: null,
      modelProviderCredentialModelId: "model-row-1",
      modelId: "gpt-5.4",
      name: "GPT-5.4",
      description: "Latest frontier agentic coding model.",
      reasoningSupported: true,
      reasoningLevels: ["low", "medium", "high"],
    }],
  }]);

  await app.close();
});

test("GraphQL AgentCreateOptions exposes only one default across managed and user credentials", async () => {
  const app = Fastify();
  const config = AgentCreateOptionsQueryTestHarness.createConfigMock();
  const database = AgentCreateOptionsQueryTestHarness.createDatabaseMock({
    platformModelRecords: [{
      id: "platform-model-1",
      isDefault: true,
      modelProvider: "companyhelm",
      modelId: "gpt-5.5",
      name: "GPT-5.5",
      description: "CompanyHelm managed model.",
      reasoningSupported: true,
      reasoningLevels: ["low", "medium", "high"],
    }],
    platformRouteRecords: [{
      platformModelId: "platform-model-1",
      platformModelProviderCredentialModelId: "platform-model-row-1",
    }],
    defaultProviderSelectionRecords: [{
      modelCredentialSource: "user_provided",
      modelProviderCredentialId: "credential-1",
    }],
  });
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
        query AgentCreateOptions {
          AgentCreateOptions {
            modelCredentialSource
            isDefault
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.errors, undefined);
  assert.deepEqual(document.data.AgentCreateOptions.map((option: { isDefault: boolean }) => option.isDefault), [
    false,
    true,
  ]);

  await app.close();
});
