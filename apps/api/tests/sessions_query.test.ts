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
                    async where() {
                      return [
                        {
                          id: "session-older",
                          agentId: "agent-1",
                          currentContextTokens: 32000,
                          currentModelProviderCredentialModelId: "model-row-1",
                          currentReasoningLevel: "medium",
                          inferredTitle: "Inferred older title",
                          isCompacting: false,
                          isThinking: false,
                          maxContextTokens: 200000,
                          status: "running",
                          thinkingText: null,
                          createdAt: new Date("2026-03-24T08:00:00.000Z"),
                          updatedAt: new Date("2026-03-24T08:05:00.000Z"),
                          userSetTitle: null,
                        },
                        {
                          id: "session-newer",
                          agentId: "agent-2",
                          currentContextTokens: null,
                          currentModelProviderCredentialModelId: "model-row-2",
                          currentReasoningLevel: "high",
                          inferredTitle: null,
                          isCompacting: true,
                          isThinking: true,
                          maxContextTokens: 200000,
                          status: "archived",
                          thinkingText: "Inspecting deployment history",
                          createdAt: new Date("2026-03-24T09:00:00.000Z"),
                          updatedAt: new Date("2026-03-24T09:30:00.000Z"),
                          userSetTitle: "Fallback user title",
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
        query Sessions {
          Sessions {
            id
            agentId
            currentContextTokens
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
  assert.deepEqual(document.data.Sessions, [
    {
      id: "session-newer",
      agentId: "agent-2",
      currentContextTokens: null,
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
      currentContextTokens: 32000,
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
