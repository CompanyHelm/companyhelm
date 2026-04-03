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

class UpdateAgentMutationTestHarness {
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

  static createDatabaseMock(options?: {
    currentRequirements?: {
      minCpuCount: number;
      minDiskSpaceGb: number;
      minMemoryGb: number;
    } | null;
    provider?: "daytona" | "e2b";
    providerName?: string;
  }) {
    const updatedValues: Array<Record<string, unknown>> = [];
    let selectCallCount = 0;
    const provider = options?.provider ?? "e2b";
    const providerName = options?.providerName ?? (provider === "e2b" ? "Primary E2B" : "Primary Daytona");
    const currentRequirements = options?.currentRequirements ?? null;

    return {
      updatedValues,
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
                        id: "credential-2",
                        modelProvider: "anthropic",
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
                        id: "model-row-2",
                        modelProviderCredentialId: "credential-2",
                        name: "Claude Opus 4.6",
                        reasoningLevels: null,
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
                        id: "compute-provider-definition-1",
                        name: providerName,
                        provider,
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
                        defaultComputeProviderDefinitionId: "compute-provider-definition-1",
                        id: "agent-1",
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
                      if (!currentRequirements) {
                        return [];
                      }

                      return [{
                        ...currentRequirements,
                        agentId: "agent-1",
                        companyId: "company-123",
                        createdAt: new Date("2026-03-24T09:00:00.000Z"),
                        id: "requirements-1",
                        updatedAt: new Date("2026-03-24T10:00:00.000Z"),
                      }];
                    },
                  };
                },
              };
            }

            throw new Error("Unexpected select call.");
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
                          id: "agent-1",
                          name: String(value.name),
                          defaultComputeProviderDefinitionId: String(value.defaultComputeProviderDefinitionId),
                          defaultModelProviderCredentialModelId: String(
                            value.defaultModelProviderCredentialModelId,
                          ),
                          defaultReasoningLevel: value.default_reasoning_level ?? null,
                          systemPrompt: value.system_prompt ?? null,
                          createdAt: new Date("2026-03-24T09:00:00.000Z"),
                          updatedAt: new Date("2026-03-24T10:30:00.000Z"),
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

test("GraphQL UpdateAgent mutation rewrites the persisted agent configuration", async () => {
  const app = Fastify();
  const config = UpdateAgentMutationTestHarness.createConfigMock();
  const database = UpdateAgentMutationTestHarness.createDatabaseMock();
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
        mutation UpdateAgent($input: UpdateAgentInput!) {
          UpdateAgent(input: $input) {
            id
            name
            modelProviderCredentialId
            modelProviderCredentialModelId
            modelProvider
            modelName
            reasoningLevel
            systemPrompt
            updatedAt
          }
        }
      `,
      variables: {
        input: {
          id: "agent-1",
          defaultComputeProviderDefinitionId: "compute-provider-definition-1",
          name: "Executive Agent",
          modelProviderCredentialId: "credential-2",
          modelProviderCredentialModelId: "model-row-2",
          systemPrompt: "Handle complex work.",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.UpdateAgent, {
    id: "agent-1",
    name: "Executive Agent",
    modelProviderCredentialId: "credential-2",
    modelProviderCredentialModelId: "model-row-2",
    modelProvider: "anthropic",
    modelName: "Claude Opus 4.6",
    reasoningLevel: null,
    systemPrompt: "Handle complex work.",
    updatedAt: "2026-03-24T10:30:00.000Z",
  });
  assert.equal(database.updatedValues.length, 1);
  assert.equal(database.updatedValues[0]?.defaultComputeProviderDefinitionId, "compute-provider-definition-1");
  assert.equal(database.updatedValues[0]?.name, "Executive Agent");
  assert.equal(database.updatedValues[0]?.defaultModelProviderCredentialModelId, "model-row-2");
  assert.equal(database.updatedValues[0]?.default_reasoning_level, null);
  assert.equal(database.updatedValues[0]?.system_prompt, "Handle complex work.");

  await app.close();
});

test("GraphQL UpdateAgent mutation rejects switching to a provider that cannot satisfy the current requirements", async () => {
  const app = Fastify();
  const config = UpdateAgentMutationTestHarness.createConfigMock();
  const database = UpdateAgentMutationTestHarness.createDatabaseMock({
    currentRequirements: {
      minCpuCount: 4,
      minDiskSpaceGb: 20,
      minMemoryGb: 8,
    },
    provider: "daytona",
    providerName: "Primary Daytona",
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
        mutation UpdateAgent($input: UpdateAgentInput!) {
          UpdateAgent(input: $input) {
            id
          }
        }
      `,
      variables: {
        input: {
          id: "agent-1",
          defaultComputeProviderDefinitionId: "compute-provider-definition-1",
          name: "Executive Agent",
          modelProviderCredentialId: "credential-2",
          modelProviderCredentialModelId: "model-row-2",
          systemPrompt: "Handle complex work.",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.data, null);
  assert.match(document.errors[0]?.message ?? "", /Disk must be between 3 and 10 GB for Daytona\./);
  assert.equal(database.updatedValues.length, 0);

  await app.close();
});
