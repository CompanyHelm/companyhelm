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
import { EnvironmentsQueryResolver } from "../src/graphql/resolvers/environments.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

class EnvironmentsQueryTestHarness {
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
    const scopedCompanyIds: string[] = [];
    let selectCallCount = 0;

    return {
      scopedCompanyIds,
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
                        agentId: "agent-1",
                        companyId: "company-123",
                        cpuCount: 4,
                        createdAt: new Date("2026-03-26T09:00:00.000Z"),
                        diskSpaceGb: 120,
                        displayName: "Research Ubuntu Box",
                        id: "env-1",
                        lastSeenAt: new Date("2026-03-27T15:00:00.000Z"),
                        memoryGb: 16,
                        platform: "linux",
                        provider: "e2b",
                        providerDefinitionId: "definition-1",
                        providerEnvironmentId: "e2b-env-1",
                        templateId: "e2b/desktop",
                        updatedAt: new Date("2026-03-27T15:00:00.000Z"),
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
                        id: "agent-1",
                        name: "Research Agent",
                      }];
                    },
                  };
                },
              };
            }

            throw new Error("Unexpected select call.");
          },
        } as never;
      },
      async withCompanyContext(companyId: string, callback: (database: unknown) => Promise<unknown>) {
        scopedCompanyIds.push(companyId);
        return callback(this.getDatabase());
      },
    };
  }
}

test("GraphQL Environments query lists company-scoped agent environments", async () => {
  const app = Fastify();
  const database = EnvironmentsQueryTestHarness.createDatabaseMock();
  const getEnvironmentStatus = async (_transactionProvider: unknown, environment: { companyId: string }) => {
    assert.equal(environment.companyId, "company-123");
    return "stopped" as const;
  };
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

  const graphqlApplication = new GraphqlApplication(
    EnvironmentsQueryTestHarness.createConfigMock(),
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
    new RefreshModelProviderCredentialModelsMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialModelsQueryResolver(),
    new ModelProviderCredentialsQueryResolver(),
  );
  (
    graphqlApplication as unknown as {
      environmentsQueryResolver: EnvironmentsQueryResolver;
    }
  ).environmentsQueryResolver = new EnvironmentsQueryResolver({
    async createShell() {
      throw new Error("createShell should not run for the environments query");
    },
    async deleteEnvironment() {
      throw new Error("deleteEnvironment should not run for the environments query");
    },
    getEnvironmentStatus,
    getProvider() {
      return "e2b";
    },
    async provisionEnvironment() {
      throw new Error("provisionEnvironment should not run for the environments query");
    },
    async startEnvironment() {
      throw new Error("startEnvironment should not run for the environments query");
    },
    async stopEnvironment() {
      throw new Error("stopEnvironment should not run for the environments query");
    },
    supportsOnDemandProvisioning() {
      return true;
    },
  } as never);
  await graphqlApplication.register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        query Environments {
          Environments {
            id
            agentId
            agentName
            provider
            providerEnvironmentId
            displayName
            platform
            status
            cpuCount
            memoryGb
            diskSpaceGb
            lastSeenAt
            createdAt
            updatedAt
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.Environments, [{
    id: "env-1",
    agentId: "agent-1",
    agentName: "Research Agent",
    provider: "e2b",
    providerEnvironmentId: "e2b-env-1",
    displayName: "Research Ubuntu Box",
    platform: "linux",
    status: "stopped",
    cpuCount: 4,
    memoryGb: 16,
    diskSpaceGb: 120,
    lastSeenAt: "2026-03-27T15:00:00.000Z",
    createdAt: "2026-03-26T09:00:00.000Z",
    updatedAt: "2026-03-27T15:00:00.000Z",
  }]);
  assert.deepEqual(database.scopedCompanyIds, ["company-123"]);

  await app.close();
});
