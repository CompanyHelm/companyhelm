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

class CreateTaskMutationTestHarness {
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
                        id: "stage-1",
                        name: "Backlog",
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
                      id: "task-1",
                      name: String(value.name),
                      description: value.description ?? null,
                      status: value.status,
                      taskStageId: value.taskStageId ?? null,
                      createdAt: new Date("2026-03-25T10:15:00.000Z"),
                      updatedAt: new Date("2026-03-25T10:15:00.000Z"),
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

test("GraphQL CreateTask mutation creates one task in the selected stage", async () => {
  const app = Fastify();
  const config = CreateTaskMutationTestHarness.createConfigMock();
  const database = CreateTaskMutationTestHarness.createDatabaseMock();
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
        mutation CreateTask($input: CreateTaskInput!) {
          CreateTask(input: $input) {
            id
            name
            description
            status
            taskStageId
            taskStageName
            assignedAt
            assignee {
              kind
              id
              name
              email
            }
          }
        }
      `,
      variables: {
        input: {
          name: "Write landing page copy",
          description: "Keep the first pass short.",
          status: "draft",
          taskStageId: "stage-1",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.CreateTask, {
    id: "task-1",
    name: "Write landing page copy",
    description: "Keep the first pass short.",
    status: "draft",
    taskStageId: "stage-1",
    taskStageName: "Backlog",
    assignedAt: null,
    assignee: null,
  });
  assert.equal(database.insertedValues.length, 1);
  assert.equal(database.insertedValues[0]?.companyId, "company-123");
  assert.equal(database.insertedValues[0]?.createdByUserId, "user-123");
  assert.equal(database.insertedValues[0]?.taskStageId, "stage-1");
  assert.equal(database.insertedValues[0]?.rootTaskId, database.insertedValues[0]?.id);

  await app.close();
});
