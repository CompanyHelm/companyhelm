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

class TaskQueryTestHarness {
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
                        assignedAgentId: null,
                        assignedAt: new Date("2026-04-02T18:00:00.000Z"),
                        assignedUserId: "user-1",
                        createdAt: new Date("2026-04-02T17:00:00.000Z"),
                        description: "Keep the artifact scope narrow.",
                        id: "task-1",
                        name: "Review launch notes",
                        status: "in_progress",
                        taskCategoryId: "category-1",
                        updatedAt: new Date("2026-04-02T18:30:00.000Z"),
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
                        id: "category-1",
                        name: "Backlog",
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
                        email: "user@example.com",
                        firstName: "Casey",
                        id: "user-1",
                        lastName: "Example",
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

test("GraphQL Task query loads one task with category and assignee metadata", async () => {
  const app = Fastify();
  const config = TaskQueryTestHarness.createConfigMock();
  const database = TaskQueryTestHarness.createDatabaseMock();
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
        query Task($id: ID!) {
          Task(id: $id) {
            id
            name
            description
            status
            taskCategoryId
            taskCategoryName
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
        id: "task-1",
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.Task, {
    id: "task-1",
    name: "Review launch notes",
    description: "Keep the artifact scope narrow.",
    status: "in_progress",
    taskCategoryId: "category-1",
    taskCategoryName: "Backlog",
    assignedAt: "2026-04-02T18:00:00.000Z",
    assignee: {
      kind: "user",
      id: "user-1",
      name: "Casey Example",
      email: "user@example.com",
    },
    createdAt: "2026-04-02T17:00:00.000Z",
    updatedAt: "2026-04-02T18:30:00.000Z",
  });

  await app.close();
});
