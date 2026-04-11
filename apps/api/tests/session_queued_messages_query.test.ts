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

class SessionQueuedMessagesQueryTestHarness {
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
                        agentId: "agent-1",
                        createdAt: new Date("2026-03-31T07:50:00.000Z"),
                        currentContextTokens: null,
                        currentModelProviderCredentialModelId: "model-row-1",
                        currentReasoningLevel: "medium",
                        forkedFromTurnId: null,
                        id: "session-1",
                        inferredTitle: "Queued session",
                        isCompacting: false,
                        isThinking: false,
                        maxContextTokens: null,
                        ownerUserId: "user-123",
                        status: "running",
                        thinkingText: null,
                        updatedAt: new Date("2026-03-31T08:01:00.000Z"),
                        userSetTitle: null,
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
                        modelId: "gpt-5.4",
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

            if (selectCallCount === 4) {
              return {
                from() {
                  return {
                    async where() {
                      return [{
                        claimedAt: new Date("2026-03-31T08:00:30.000Z"),
                        companyId: "company-123",
                        createdAt: new Date("2026-03-31T08:00:00.000Z"),
                        dispatchedAt: null,
                        id: "queued-1",
                        sessionId: "session-1",
                        shouldSteer: false,
                        status: "pending",
                        updatedAt: new Date("2026-03-31T08:01:00.000Z"),
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
                      return [
                        {
                          arguments: null,
                          companyId: "company-123",
                          createdAt: new Date("2026-03-31T08:00:00.000Z"),
                          data: null,
                          id: "content-1",
                          mimeType: null,
                          sessionQueuedMessageId: "queued-1",
                          structuredContent: null,
                          text: "Focus on the flaky worker.",
                          toolCallId: null,
                          toolName: null,
                          type: "text",
                          updatedAt: new Date("2026-03-31T08:01:00.000Z"),
                        },
                        {
                          arguments: null,
                          companyId: "company-123",
                          createdAt: new Date("2026-03-31T08:00:01.000Z"),
                          data: "encoded-image",
                          id: "image-1",
                          mimeType: "image/png",
                          sessionQueuedMessageId: "queued-1",
                          structuredContent: null,
                          text: null,
                          toolCallId: null,
                          toolName: null,
                          type: "image",
                          updatedAt: new Date("2026-03-31T08:01:00.000Z"),
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
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback(this.getDatabase());
      },
    };
  }
}

test("GraphQL SessionQueuedMessages query returns queued rows for one session", async () => {
  const app = Fastify();
  const config = SessionQueuedMessagesQueryTestHarness.createConfigMock();
  const database = SessionQueuedMessagesQueryTestHarness.createDatabaseMock();
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
        query SessionQueuedMessages($sessionId: ID!) {
          SessionQueuedMessages(sessionId: $sessionId) {
            id
            sessionId
            text
            images {
              id
              base64EncodedImage
              mimeType
            }
            shouldSteer
            status
            claimedAt
            dispatchedAt
            createdAt
            updatedAt
          }
        }
      `,
      variables: {
        sessionId: "session-1",
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.SessionQueuedMessages, [{
    claimedAt: "2026-03-31T08:00:30.000Z",
    createdAt: "2026-03-31T08:00:00.000Z",
    dispatchedAt: null,
    id: "queued-1",
    images: [{
      base64EncodedImage: "encoded-image",
      id: "image-1",
      mimeType: "image/png",
    }],
    sessionId: "session-1",
    shouldSteer: false,
    status: "pending",
    text: "Focus on the flaky worker.",
    updatedAt: "2026-03-31T08:01:00.000Z",
  }]);

  await app.close();
});
