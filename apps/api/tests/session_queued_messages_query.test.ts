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
                        companyId: "company-123",
                        createdAt: new Date("2026-03-31T08:00:00.000Z"),
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
                        updatedAt: new Date("2026-03-31T08:01:00.000Z"),
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
                        base64EncodedImage: "encoded-image",
                        companyId: "company-123",
                        createdAt: new Date("2026-03-31T08:00:00.000Z"),
                        id: "image-1",
                        mimeType: "image/png",
                        sessionQueuedMessageId: "queued-1",
                        updatedAt: new Date("2026-03-31T08:01:00.000Z"),
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
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback(this.getDatabase());
      },
    };
  }
}

test("GraphQL SessionQueuedMessages query returns the pending queue for one session", async () => {
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
    createdAt: "2026-03-31T08:00:00.000Z",
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
