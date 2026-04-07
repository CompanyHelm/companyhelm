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

class AddAgentMutationTestHarness {
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
      security: {
        encryption: {
          key: "super-secret-key",
          key_id: "key-1",
        },
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
            if (selectCallCount === 1) {
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

            if (selectCallCount === 2) {
              return {
                from() {
                  return {
                    async where() {
                      return [{
                        id: "model-row-1",
                        modelProviderCredentialId: "credential-1",
                        name: "GPT-5.4",
                        reasoningLevels: ["low", "medium", "high"],
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
                        id: "compute-provider-definition-1",
                        name: "Primary E2B",
                        provider: "e2b",
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
                        id: "agent-1",
                      }];
                    },
                  };
                },
              };
            }

            if (selectCallCount === 5) {
              return {
                from() {
                  return {
                    async where() {
                      return [{
                        companyId: "company-123",
                        createdAt: new Date("2026-03-24T12:00:00.000Z"),
                        description: "Used for repository access",
                        envVarName: "GITHUB_TOKEN",
                        id: "secret-1",
                        name: "GitHub token",
                        updatedAt: new Date("2026-03-24T12:00:00.000Z"),
                      }];
                    },
                  };
                },
              };
            }

            if (selectCallCount === 6) {
              return {
                from() {
                  return {
                    async where() {
                      return [];
                    },
                  };
                },
              };
            }

            if (selectCallCount === 7) {
              return {
                from() {
                  return {
                    async where() {
                      return [{
                        defaultComputeProviderDefinitionId: "compute-provider-definition-1",
                        id: "agent-1",
                      }];
                    },
                  };
                },
              };
            }

            if (selectCallCount === 8) {
              return {
                from() {
                  return {
                    async where() {
                      return [{
                        provider: "e2b",
                      }];
                    },
                  };
                },
              };
            }

            if (selectCallCount === 9) {
              return {
                from() {
                  return {
                    async where() {
                      return [];
                    },
                  };
                },
              };
            }

            throw new Error(`Unexpected select call: ${selectCallCount}`);
          },
          insert() {
            return {
              values(value: Record<string, unknown>) {
                insertedValues.push(value);
                return {
                  async returning() {
                    if ("secretId" in value) {
                      return [];
                    }

                    if ("minCpuCount" in value) {
                      return [{
                        id: "requirements-1",
                        agentId: "agent-1",
                        companyId: "company-123",
                        createdAt: new Date("2026-03-24T12:00:00.000Z"),
                        minCpuCount: Number(value.minCpuCount),
                        minDiskSpaceGb: Number(value.minDiskSpaceGb),
                        minMemoryGb: Number(value.minMemoryGb),
                        updatedAt: new Date("2026-03-24T12:00:00.000Z"),
                      }];
                    }

                    return [{
                      id: "agent-1",
                      name: String(value.name),
                      defaultComputeProviderDefinitionId: String(value.defaultComputeProviderDefinitionId),
                      defaultModelProviderCredentialModelId: String(value.defaultModelProviderCredentialModelId),
                      defaultReasoningLevel: value.default_reasoning_level ?? null,
                      systemPrompt: value.system_prompt ?? null,
                      createdAt: new Date("2026-03-24T12:00:00.000Z"),
                      updatedAt: new Date("2026-03-24T12:00:00.000Z"),
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

test("GraphQL AddAgent mutation creates an agent with optional advanced defaults", async () => {
  const app = Fastify();
  const config = AddAgentMutationTestHarness.createConfigMock();
  const database = AddAgentMutationTestHarness.createDatabaseMock();
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
        mutation AddAgent($input: AddAgentInput!) {
          AddAgent(input: $input) {
            id
            name
            modelProvider
            modelName
            reasoningLevel
            systemPrompt
          }
        }
      `,
      variables: {
        input: {
          defaultComputeProviderDefinitionId: "compute-provider-definition-1",
          defaultEnvironmentTemplateId: "e2b/desktop",
          name: "Research Agent",
          modelProviderCredentialId: "credential-1",
          modelProviderCredentialModelId: "model-row-1",
          reasoningLevel: "high",
          secretIds: ["secret-1"],
          systemPrompt: "You are concise.",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.AddAgent, {
    id: "agent-1",
    name: "Research Agent",
    modelProvider: "openai",
    modelName: "GPT-5.4",
    reasoningLevel: "high",
    systemPrompt: "You are concise.",
  });
  assert.equal(database.insertedValues.length, 2);
  assert.equal(database.insertedValues[0]?.companyId, "company-123");
  assert.equal(database.insertedValues[0]?.defaultComputeProviderDefinitionId, "compute-provider-definition-1");
  assert.equal(database.insertedValues[0]?.defaultEnvironmentTemplateId, "e2b/desktop");
  assert.equal(database.insertedValues[0]?.default_reasoning_level, "high");
  assert.equal(database.insertedValues[0]?.system_prompt, "You are concise.");
  assert.deepEqual(database.insertedValues[1], {
    agentId: "agent-1",
    companyId: "company-123",
    createdAt: database.insertedValues[1]?.createdAt,
    createdByUserId: "user-123",
    secretId: "secret-1",
  });
  await app.close();
});
