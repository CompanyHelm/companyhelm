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

class SessionsQueryTestHarness {
  static createConfigMock(): Config {
    return {
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      log: {
        json: false,
        level: "info",
      },
      database: {
        host: "localhost",
        name: "companyhelm",
        port: 5432,
        roles: {
          app_runtime: {
            username: "app-runtime",
            password: "secret",
          },
        },
      },
      auth: {
        provider: "clerk",
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
                    where() {
                      return {
                        async orderBy() {
                          return [
                            {
                              id: "session-newer",
                              agentId: "agent-2",
                              currentContextTokens: null,
                              currentModelProviderCredentialModelId: "model-row-2",
                              currentReasoningLevel: "high",
                              forkedFromTurnId: "turn-source-1",
                              inferredTitle: null,
                              isCompacting: true,
                              isThinking: true,
                              maxContextTokens: 200000,
                              ownerUserId: "user-123",
                              status: "archived",
                              thinkingText: "Inspecting deployment history",
                              createdAt: new Date("2026-03-24T09:00:00.000Z"),
                              updatedAt: new Date("2026-03-24T09:30:00.000Z"),
                              userSetTitle: "Fallback user title",
                            },
                            {
                              id: "session-older",
                              agentId: "agent-1",
                              currentContextTokens: 32000,
                              currentModelProviderCredentialModelId: "model-row-1",
                              currentReasoningLevel: "medium",
                              forkedFromTurnId: null,
                              inferredTitle: "Inferred older title",
                              isCompacting: false,
                              isThinking: false,
                              maxContextTokens: 200000,
                              ownerUserId: null,
                              status: "running",
                              thinkingText: null,
                              createdAt: new Date("2026-03-24T08:00:00.000Z"),
                              updatedAt: new Date("2026-03-24T08:05:00.000Z"),
                              userSetTitle: null,
                            },
                          ];
                        },
                      };
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
                        id: "turn-source-1",
                        sessionId: "session-source",
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
                        agentId: "agent-source",
                        id: "session-source",
                        inferredTitle: "Original review thread",
                        userSetTitle: null,
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
                      return [
                        {
                          id: "model-row-1",
                          modelId: "gpt-5.4",
                        },
                        {
                          id: "model-row-2",
                          modelId: "claude-3.7-sonnet",
                        },
                      ];
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
                      return [
                        {
                          id: "task-run-older",
                          sessionId: "session-older",
                          taskId: "task-older",
                          updatedAt: new Date("2026-03-24T08:03:00.000Z"),
                        },
                        {
                          id: "task-run-newest",
                          sessionId: "session-older",
                          taskId: "task-newest",
                          updatedAt: new Date("2026-03-24T08:04:00.000Z"),
                        },
                      ];
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
                      return [
                        {
                          id: "task-older",
                          name: "Older linked task",
                          status: "in_progress",
                        },
                        {
                          id: "task-newest",
                          name: "Newest linked task",
                          status: "in_progress",
                        },
                      ];
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
                      return [
                        {
                          sessionId: "session-older",
                        },
                      ];
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

test("GraphQL Sessions query lists company sessions ordered by most recently updated first", async () => {
  const app = Fastify();
  const config = SessionsQueryTestHarness.createConfigMock();
  const database = SessionsQueryTestHarness.createDatabaseMock();
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
        query Sessions {
          Sessions {
            id
            agentId
            associatedTask {
              id
              name
              status
            }
            hasUnread
            currentContextTokens
            forkedFromSessionAgentId
            forkedFromSessionId
            forkedFromSessionTitle
            forkedFromTurnId
            isCompacting
            modelId
            maxContextTokens
            reasoningLevel
            inferredTitle
            status
            createdAt
            updatedAt
            userSetTitle
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.ok(document.data, JSON.stringify(document, null, 2));
  assert.deepEqual(document.data.Sessions, [
    {
      id: "session-newer",
      agentId: "agent-2",
      associatedTask: null,
      hasUnread: true,
      currentContextTokens: null,
      forkedFromSessionAgentId: "agent-source",
      forkedFromSessionId: "session-source",
      forkedFromSessionTitle: "Original review thread",
      forkedFromTurnId: "turn-source-1",
      isCompacting: true,
      modelId: "claude-3.7-sonnet",
      maxContextTokens: 200000,
      reasoningLevel: "high",
      inferredTitle: null,
      status: "archived",
      createdAt: "2026-03-24T09:00:00.000Z",
      updatedAt: "2026-03-24T09:30:00.000Z",
      userSetTitle: "Fallback user title",
    },
    {
      id: "session-older",
      agentId: "agent-1",
      associatedTask: {
        id: "task-newest",
        name: "Newest linked task",
        status: "in_progress",
      },
      hasUnread: false,
      currentContextTokens: 32000,
      forkedFromSessionAgentId: null,
      forkedFromSessionId: null,
      forkedFromSessionTitle: null,
      forkedFromTurnId: null,
      isCompacting: false,
      modelId: "gpt-5.4",
      maxContextTokens: 200000,
      reasoningLevel: "medium",
      inferredTitle: "Inferred older title",
      status: "running",
      createdAt: "2026-03-24T08:00:00.000Z",
      updatedAt: "2026-03-24T08:05:00.000Z",
      userSetTitle: null,
    },
  ]);
  assert.deepEqual(database.scopedCompanyIds, ["company-123"]);

  await app.close();
});
