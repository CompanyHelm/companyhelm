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

class AgentQueryTestHarness {
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
                  return {
                    async where() {
                      return [{
                        id: "agent-1",
                        name: "Research Agent",
                        defaultModelProviderCredentialModelId: "model-row-1",
                        defaultComputeProviderDefinitionId: "compute-provider-definition-1",
                        defaultEnvironmentTemplateId: "e2b/desktop",
                        defaultReasoningLevel: "high",
                        systemPrompt: "You are concise.",
                        createdAt: new Date("2026-03-24T09:00:00.000Z"),
                        updatedAt: new Date("2026-03-24T09:10:00.000Z"),
                      }];
                    },
                  };
                },
              };
            }

            if (selectCallCount === 2) {
              return {
                from() {
                  return {
                    async where() {
                      return [{
                        id: "compute-provider-definition-1",
                        name: "Primary E2B",
                        provider: "e2b",
                      }];
                    },
                  };
                },
              };
            }

            if (selectCallCount === 3) {
              return {
                from() {
                  return {
                    async where() {
                      return [{
                        id: "model-row-1",
                        modelProviderCredentialId: "credential-1",
                        name: "GPT-5.4",
                      }];
                    },
                  };
                },
              };
            }

            if (selectCallCount === 4) {
              return {
                from() {
                  return {
                    async where() {
                      return [{
                        id: "credential-1",
                        modelProvider: "openai",
                      }];
                    },
                  };
                },
              };
            }

            throw new Error(`Unexpected select call: ${selectCallCount}`);
          },
        } as never;
      },
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback(this.getDatabase());
      },
    };
  }
}

test("GraphQL Agent query returns one agent detail record", async () => {
  const app = Fastify();
  const config = AgentQueryTestHarness.createConfigMock();
  const database = AgentQueryTestHarness.createDatabaseMock();
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
        query AgentDetail($id: ID!) {
          Agent(id: $id) {
            id
            name
            defaultEnvironmentTemplateId
            modelProviderCredentialId
            modelProviderCredentialModelId
            modelProvider
            modelName
            reasoningLevel
            systemPrompt
            environmentTemplate {
              computerUse
              cpuCount
              diskSpaceGb
              memoryGb
              name
              templateId
            }
            createdAt
            updatedAt
          }
        }
      `,
      variables: {
        id: "agent-1",
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.Agent, {
    id: "agent-1",
    name: "Research Agent",
    defaultEnvironmentTemplateId: "e2b/desktop",
    modelProviderCredentialId: "credential-1",
    modelProviderCredentialModelId: "model-row-1",
    modelProvider: "openai",
    modelName: "GPT-5.4",
    reasoningLevel: "high",
    systemPrompt: "You are concise.",
    environmentTemplate: {
      computerUse: true,
      cpuCount: 4,
      diskSpaceGb: 10,
      memoryGb: 8,
      name: "Desktop",
      templateId: "e2b/desktop",
    },
    createdAt: "2026-03-24T09:00:00.000Z",
    updatedAt: "2026-03-24T09:10:00.000Z",
  });

  await app.close();
});
