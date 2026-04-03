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

class UpdateAgentEnvironmentRequirementsMutationTestHarness {
  static createConfigMock(): Config {
    return {
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      auth: {
        provider: "clerk",
      },
      daytona: {
        cpu_count: 4,
        disk_gb: 40,
        memory_gb: 8,
      },
    } as Config;
  }

  static createDatabaseMock() {
    let selectCallCount = 0;
    const insertedValues: Array<Record<string, unknown>> = [];

    return {
      insertedValues,
      getDatabase() {
        return {
          insert() {
            return {
              values(value: Record<string, unknown>) {
                insertedValues.push(value);
                return {
                  async returning() {
                    return [{
                      ...value,
                      createdAt: value.createdAt,
                      id: "requirements-1",
                      updatedAt: value.updatedAt,
                    }];
                  },
                };
              },
            };
          },
          select() {
            selectCallCount += 1;
            if (selectCallCount === 1) {
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

            if (selectCallCount === 2) {
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

            if (selectCallCount === 3) {
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
          update() {
            throw new Error("update should not be used when no requirements row exists");
          },
        } as never;
      },
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback(this.getDatabase());
      },
    };
  }
}

test("GraphQL UpdateAgentEnvironmentRequirements mutation upserts the persisted minimum compute requirements", async () => {
  const app = Fastify();
  const config = UpdateAgentEnvironmentRequirementsMutationTestHarness.createConfigMock();
  const database = UpdateAgentEnvironmentRequirementsMutationTestHarness.createDatabaseMock();
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
        mutation UpdateAgentEnvironmentRequirements($input: UpdateAgentEnvironmentRequirementsInput!) {
          UpdateAgentEnvironmentRequirements(input: $input) {
            minCpuCount
            minMemoryGb
            minDiskSpaceGb
          }
        }
      `,
      variables: {
        input: {
          agentId: "agent-1",
          minCpuCount: 6,
          minMemoryGb: 8,
          minDiskSpaceGb: 20,
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.UpdateAgentEnvironmentRequirements, {
    minCpuCount: 6,
    minMemoryGb: 8,
    minDiskSpaceGb: 20,
  });
  assert.equal(database.insertedValues.length, 1);
  assert.equal(database.insertedValues[0]?.minCpuCount, 6);
  assert.equal(database.insertedValues[0]?.minMemoryGb, 8);
  assert.equal(database.insertedValues[0]?.minDiskSpaceGb, 20);

  await app.close();
});
