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
import { UpdateSessionTitleMutation } from "../src/graphql/mutations/update_session_title.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import { ModelProvidersQueryResolver } from "../src/graphql/resolvers/model_providers.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

class UpdateSessionTitleMutationTestHarness {
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

test("GraphQL UpdateSessionTitle mutation updates the custom session title", async () => {
  const app = Fastify();
  const config = UpdateSessionTitleMutationTestHarness.createConfigMock();
  const database = UpdateSessionTitleMutationTestHarness.createDatabaseMock();
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
  const updateCalls: Array<{ companyId: string; sessionId: string; title: string | null; userId: string }> = [];
  const sessionManagerService = {
    async updateSessionTitle(
      transactionProvider: unknown,
      companyId: string,
      sessionId: string,
      title: string | null,
      userId: string,
    ) {
      assert.ok(transactionProvider);
      updateCalls.push({
        companyId,
        sessionId,
        title,
        userId,
      });
      return {
        id: sessionId,
      };
    },
  };
  const sessionReadService = {
    async getSession(
      transactionProvider: unknown,
      companyId: string,
      sessionId: string,
      userId: string,
    ) {
      assert.ok(transactionProvider);
      assert.equal(companyId, "company-123");
      assert.equal(sessionId, "session-1");
      assert.equal(userId, "user-123");

      return {
        id: "session-1",
        agentId: "agent-1",
        currentContextTokens: null,
        hasUnread: false,
        isCompacting: false,
        maxContextTokens: null,
        modelProviderCredentialModelId: "model-row-1",
        modelId: "gpt-5.4",
        reasoningLevel: "high",
        inferredTitle: "Old inferred title",
        isThinking: false,
        status: "stopped",
        thinkingText: null,
        createdAt: "2026-04-04T12:00:00.000Z",
        updatedAt: "2026-04-04T12:05:00.000Z",
        userSetTitle: "Launch prep",
      };
    },
  };

  const graphqlApplication = GraphqlApplication.fromResolvers(
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
    undefined,
    undefined,
    undefined,
    new ModelProvidersQueryResolver(),
  );
  (
    graphqlApplication as unknown as {
      updateSessionTitleMutation: UpdateSessionTitleMutation;
    }
  ).updateSessionTitleMutation = new UpdateSessionTitleMutation(
    sessionManagerService as never,
    sessionReadService as never,
  );
  await graphqlApplication.register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        mutation UpdateSessionTitle($input: UpdateSessionTitleInput!) {
          UpdateSessionTitle(input: $input) {
            id
            agentId
            modelId
            reasoningLevel
            inferredTitle
            userSetTitle
            status
          }
        }
      `,
      variables: {
        input: {
          sessionId: "session-1",
          title: "Launch prep",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(updateCalls, [{
    companyId: "company-123",
    sessionId: "session-1",
    title: "Launch prep",
    userId: "user-123",
  }]);
  const document = response.json();
  assert.deepEqual(document.data.UpdateSessionTitle, {
    id: "session-1",
    agentId: "agent-1",
    modelId: "gpt-5.4",
    reasoningLevel: "high",
    inferredTitle: "Old inferred title",
    userSetTitle: "Launch prep",
    status: "stopped",
  });

  await app.close();
});
