import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { ArchiveSessionMutation } from "../src/graphql/mutations/archive_session.ts";
import { DeleteEnvironmentMutation } from "../src/graphql/mutations/delete_environment.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { StartEnvironmentMutation } from "../src/graphql/mutations/start_environment.ts";
import { StopEnvironmentMutation } from "../src/graphql/mutations/stop_environment.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import { ModelProvidersQueryResolver } from "../src/graphql/resolvers/model_providers.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

class ArchiveSessionMutationTestHarness {
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
    return {
      getDatabase() {
        return {};
      },
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback(this.getDatabase());
      },
    };
  }
}

test("GraphQL ArchiveSession mutation archives a session and returns the updated session data", async () => {
  const app = Fastify();
  const config = ArchiveSessionMutationTestHarness.createConfigMock();
  const database = ArchiveSessionMutationTestHarness.createDatabaseMock();
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
  const sessionManagerService = {
    async archiveSession(transactionProvider: unknown, companyId: string, sessionId: string) {
      assert.ok(transactionProvider);
      assert.equal(companyId, "company-123");
      assert.equal(sessionId, "session-1");

      return {
        id: sessionId,
        agentId: "agent-1",
        currentModelId: "gpt-5.4",
        currentModelProviderCredentialModelId: "model-row-1",
        currentReasoningLevel: "high",
        isThinking: false,
        status: "archived",
        thinkingText: null,
        createdAt: new Date("2026-03-25T12:00:00.000Z"),
        updatedAt: new Date("2026-03-25T12:05:00.000Z"),
      };
    },
  };

  const graphqlApplication = new GraphqlApplication(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
    new RefreshModelProviderCredentialModelsMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database as never),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialModelsQueryResolver(),
    new ModelProviderCredentialsQueryResolver(),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    new DeleteEnvironmentMutation(),
    new StartEnvironmentMutation(),
    new StopEnvironmentMutation(),
    new ModelProvidersQueryResolver(),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    new ArchiveSessionMutation(sessionManagerService as never),
  );
  (
    graphqlApplication as unknown as {
      archiveSessionMutation: ArchiveSessionMutation;
    }
  ).archiveSessionMutation = new ArchiveSessionMutation(sessionManagerService as never);
  await graphqlApplication.register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        mutation ArchiveSession($input: ArchiveSessionInput!) {
          ArchiveSession(input: $input) {
            id
            agentId
            modelId
            reasoningLevel
            status
            createdAt
            updatedAt
          }
        }
      `,
      variables: {
        input: {
          id: "session-1",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.ArchiveSession, {
    id: "session-1",
    agentId: "agent-1",
    modelId: "gpt-5.4",
    reasoningLevel: "high",
    status: "archived",
    createdAt: "2026-03-25T12:00:00.000Z",
    updatedAt: "2026-03-25T12:05:00.000Z",
  });

  await app.close();
});
