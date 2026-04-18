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

class DeleteTaskStageMutationTestHarness {
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

  static createDatabaseMock(options: { deletedStageIsDefault?: boolean } = {}) {
    const deletedIds: string[] = [];
    const updatedValues: Array<Record<string, unknown>> = [];
    let selectCallCount = 0;
    const deletedStageId = options.deletedStageIsDefault ? "stage-backlog" : "stage-1";
    const deletedStageName = options.deletedStageIsDefault ? "Backlog" : "TODO";

    return {
      deletedIds,
      updatedValues,
      getDatabase() {
        return {
          select() {
            selectCallCount += 1;
            return {
              from() {
                return {
                  async where() {
                    if (selectCallCount === 1) {
                      return [{
                        id: "stage-backlog",
                        isDefault: true,
                        name: "Backlog",
                      }];
                    }
                    if (selectCallCount === 2) {
                      return [{
                        id: deletedStageId,
                        isDefault: options.deletedStageIsDefault ?? false,
                        name: deletedStageName,
                        createdAt: new Date("2026-03-25T10:00:00.000Z"),
                        updatedAt: new Date("2026-03-25T10:00:00.000Z"),
                      }];
                    }

                    return [
                      { id: "task-1" },
                      { id: "task-2" },
                    ];
                  },
                };
              },
            };
          },
          update() {
            return {
              set(value: Record<string, unknown>) {
                updatedValues.push(value);
                return {
                  async where() {
                    return undefined;
                  },
                };
              },
            };
          },
          delete() {
            return {
              where() {
                return {
                  async returning() {
                    deletedIds.push(deletedStageId);
                    return [{
                      id: deletedStageId,
                      isDefault: false,
                      name: deletedStageName,
                      createdAt: new Date("2026-03-25T10:00:00.000Z"),
                      updatedAt: new Date("2026-03-25T10:00:00.000Z"),
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

test("GraphQL DeleteTaskStage mutation moves tasks to Backlog before deleting one persisted task stage", async () => {
  const app = Fastify();
  const config = DeleteTaskStageMutationTestHarness.createConfigMock();
  const database = DeleteTaskStageMutationTestHarness.createDatabaseMock();
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
        mutation DeleteTaskStage($input: DeleteTaskStageInput!) {
          DeleteTaskStage(input: $input) {
            id
            name
            isDefault
            taskCount
          }
        }
      `,
      variables: {
        input: {
          id: "stage-1",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.DeleteTaskStage, {
    id: "stage-1",
    name: "TODO",
    isDefault: false,
    taskCount: 2,
  });
  assert.equal(database.updatedValues.length, 1);
  assert.equal(database.updatedValues[0]?.taskStageId, "stage-backlog");
  assert.deepEqual(database.deletedIds, ["stage-1"]);

  await app.close();
});

test("GraphQL DeleteTaskStage mutation rejects deleting Backlog", async () => {
  const app = Fastify();
  const config = DeleteTaskStageMutationTestHarness.createConfigMock();
  const database = DeleteTaskStageMutationTestHarness.createDatabaseMock({
    deletedStageIsDefault: true,
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
        mutation DeleteTaskStage($input: DeleteTaskStageInput!) {
          DeleteTaskStage(input: $input) {
            id
          }
        }
      `,
      variables: {
        input: {
          id: "stage-backlog",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.errors[0].message, "Default task stage cannot be deleted.");
  assert.equal(database.updatedValues.length, 0);
  assert.deepEqual(database.deletedIds, []);

  await app.close();
});
