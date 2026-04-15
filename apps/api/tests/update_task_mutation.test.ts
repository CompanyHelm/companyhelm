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

class UpdateTaskMutationTestHarness {
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
                        assignedAgentId: null,
                        assignedAt: null,
                        assignedUserId: null,
                        createdAt: new Date("2026-04-01T10:00:00.000Z"),
                        description: null,
                        id: "task-1",
                        name: "Draft GTM checklist",
                        status: "draft",
                        taskStageId: null,
                        updatedAt: new Date("2026-04-01T10:00:00.000Z"),
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
                        id: "stage-2",
                        name: "In Progress",
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
                        userId: "user-2",
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
                        email: "casey@example.com",
                        firstName: "Casey",
                        id: "user-2",
                        lastName: "Example",
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
                      return [];
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
                      return [{
                        id: "stage-2",
                        name: "In Progress",
                      }];
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
                        email: "casey@example.com",
                        firstName: "Casey",
                        id: "user-2",
                        lastName: "Example",
                      }];
                    },
                  };
                },
              };
            }

            throw new Error(`Unexpected select call: ${selectCallCount}`);
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
                          assignedAgentId: null,
                          assignedAt: new Date("2026-04-03T13:00:00.000Z"),
                          assignedUserId: "user-2",
                          createdAt: new Date("2026-04-01T10:00:00.000Z"),
                          description: "Capture the first launch blockers.",
                          id: "task-1",
                          name: "Finalize GTM checklist",
                          status: "in_progress",
                          taskStageId: "stage-2",
                          updatedAt: new Date("2026-04-03T13:00:00.000Z"),
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

test("GraphQL UpdateTask mutation rewrites one task inline", async () => {
  const app = Fastify();
  const config = UpdateTaskMutationTestHarness.createConfigMock();
  const database = UpdateTaskMutationTestHarness.createDatabaseMock();
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
        mutation UpdateTask($input: UpdateTaskInput!) {
          UpdateTask(input: $input) {
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
            createdAt
            updatedAt
          }
        }
      `,
      variables: {
        input: {
          taskId: "task-1",
          name: "Finalize GTM checklist",
          description: "Capture the first launch blockers.",
          status: "in_progress",
          taskStageId: "stage-2",
          assignedUserId: "user-2",
          assignedAgentId: null,
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.UpdateTask, {
    id: "task-1",
    name: "Finalize GTM checklist",
    description: "Capture the first launch blockers.",
    status: "in_progress",
    taskStageId: "stage-2",
    taskStageName: "In Progress",
    assignedAt: "2026-04-03T13:00:00.000Z",
    assignee: {
      kind: "user",
      id: "user-2",
      name: "Casey Example",
      email: "casey@example.com",
    },
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-03T13:00:00.000Z",
  });
  assert.equal(database.updatedValues.length, 1);
  assert.equal(database.updatedValues[0]?.name, "Finalize GTM checklist");
  assert.equal(database.updatedValues[0]?.taskStageId, "stage-2");
  assert.equal(database.updatedValues[0]?.assignedUserId, "user-2");
  assert.equal(database.updatedValues[0]?.assignedAgentId, null);
  assert.ok(database.updatedValues[0]?.assignedAt instanceof Date);

  await app.close();
});
