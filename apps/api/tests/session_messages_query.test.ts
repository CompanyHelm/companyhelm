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

class SessionMessagesQueryTestHarness {
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
                      return [
                        {
                          id: "message-2",
                          sessionId: "session-1",
                          role: "assistant",
                          status: "completed",
                          toolCallId: null,
                          toolName: null,
                          isError: false,
                          createdAt: new Date("2026-03-24T08:01:00.000Z"),
                          updatedAt: new Date("2026-03-24T08:02:00.000Z"),
                        },
                        {
                          id: "message-1",
                          sessionId: "session-1",
                          role: "user",
                          status: "completed",
                          toolCallId: null,
                          toolName: null,
                          isError: false,
                          createdAt: new Date("2026-03-24T08:00:00.000Z"),
                          updatedAt: new Date("2026-03-24T08:00:00.000Z"),
                        },
                      ];
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
                      return [
                        {
                          messageId: "message-2",
                          text: "Line two",
                          type: "text",
                          createdAt: new Date("2026-03-24T08:01:30.000Z"),
                        },
                        {
                          messageId: "message-1",
                          text: "hi",
                          type: "text",
                          createdAt: new Date("2026-03-24T08:00:00.000Z"),
                        },
                        {
                          messageId: "message-2",
                          text: "Line one",
                          type: "text",
                          createdAt: new Date("2026-03-24T08:01:00.000Z"),
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

test("GraphQL SessionMessages query returns transcript messages with aggregated text content", async () => {
  const app = Fastify();
  const config = SessionMessagesQueryTestHarness.createConfigMock();
  const database = SessionMessagesQueryTestHarness.createDatabaseMock();
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
        query SessionMessages {
          SessionMessages {
            id
            sessionId
            role
            status
            toolCallId
            toolName
            text
            isError
            createdAt
            updatedAt
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.SessionMessages, [
    {
      id: "message-1",
      sessionId: "session-1",
      role: "user",
      status: "completed",
      toolCallId: null,
      toolName: null,
      text: "hi",
      isError: false,
      createdAt: "2026-03-24T08:00:00.000Z",
      updatedAt: "2026-03-24T08:00:00.000Z",
    },
    {
      id: "message-2",
      sessionId: "session-1",
      role: "assistant",
      status: "completed",
      toolCallId: null,
      toolName: null,
      text: "Line one\nLine two",
      isError: false,
      createdAt: "2026-03-24T08:01:00.000Z",
      updatedAt: "2026-03-24T08:02:00.000Z",
    },
  ]);

  await app.close();
});
