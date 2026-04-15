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

class SetTaskStageMutationTestHarness {
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
    const updatedValues: Array<Record<string, unknown>> = [];
    let selectCallCount = 0;

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
                        id: "stage-2",
                        name: "In Progress",
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
                          id: "task-1",
                          name: "Write landing page copy",
                          description: "Keep the first pass short.",
                          status: "draft",
                          taskStageId: "stage-2",
                          createdAt: new Date("2026-03-25T10:15:00.000Z"),
                          updatedAt: new Date("2026-03-25T11:00:00.000Z"),
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

test("GraphQL SetTaskStage mutation moves one task into a persisted lane", async () => {
  const app = Fastify();
  const config = SetTaskStageMutationTestHarness.createConfigMock();
  const database = SetTaskStageMutationTestHarness.createDatabaseMock();
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
        mutation SetTaskStage($input: SetTaskStageInput!) {
          SetTaskStage(input: $input) {
            id
            taskStageId
            taskStageName
          }
        }
      `,
      variables: {
        input: {
          taskId: "task-1",
          taskStageId: "stage-2",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.SetTaskStage, {
    id: "task-1",
    taskStageId: "stage-2",
    taskStageName: "In Progress",
  });
  assert.equal(database.updatedValues.length, 1);
  assert.equal(database.updatedValues[0]?.taskStageId, "stage-2");

  await app.close();
});
