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

            throw new Error("Unexpected select call.");
          },
          insert() {
            return {
              values(value: Record<string, unknown>) {
                insertedValues.push(value);
                return {
                  async returning() {
                    return [{
                      id: "agent-1",
                      name: String(value.name),
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

test("GraphQL AddAgent mutation creates an agent with the selected model and reasoning level", async () => {
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
          name: "Research Agent",
          modelProviderCredentialId: "credential-1",
          modelProviderCredentialModelId: "model-row-1",
          reasoningLevel: "high",
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
  assert.equal(database.insertedValues.length, 1);
  assert.equal(database.insertedValues[0]?.companyId, "company-123");
  assert.equal(database.insertedValues[0]?.default_reasoning_level, "high");
  assert.equal(database.insertedValues[0]?.system_prompt, "You are concise.");

  await app.close();
});
