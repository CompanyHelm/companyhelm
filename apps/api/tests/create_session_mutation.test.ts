import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddAgentMutation } from "../src/graphql/mutations/add_agent.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { CreateSessionMutation } from "../src/graphql/mutations/create_session.ts";
import { DeleteAgentMutation } from "../src/graphql/mutations/delete_agent.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { UpdateAgentMutation } from "../src/graphql/mutations/update_agent.ts";
import { AgentCreateOptionsQueryResolver } from "../src/graphql/resolvers/agent_create_options.ts";
import { AgentQueryResolver } from "../src/graphql/resolvers/agent.ts";
import { AgentsQueryResolver } from "../src/graphql/resolvers/agents.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import { ModelProvidersQueryResolver } from "../src/graphql/resolvers/model_providers.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

class CreateSessionMutationTestHarness {
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

test("GraphQL CreateSession mutation creates a session and returns the persisted session data", async () => {
  const app = Fastify();
  const config = CreateSessionMutationTestHarness.createConfigMock();
  const database = CreateSessionMutationTestHarness.createDatabaseMock();
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
    async createSession(
      transactionProvider: unknown,
      companyId: string,
      agentId: string,
      userMessage: string,
      modelProviderCredentialModelId?: string | null,
      reasoningLevel?: string | null,
      _sessionId?: string | null,
      userId?: string | null,
      images?: Array<{ base64EncodedImage: string; mimeType: string }>,
    ) {
      assert.ok(transactionProvider);
      assert.equal(companyId, "company-123");
      assert.equal(agentId, "agent-1");
      assert.equal(userMessage, "Draft the onboarding email.");
      assert.equal(modelProviderCredentialModelId, "model-row-1");
      assert.equal(reasoningLevel, "high");
      assert.equal(userId, "user-123");
      assert.deepEqual(images, [{
        base64EncodedImage: "encoded-image",
        mimeType: "image/png",
      }]);

      return {
        id: "session-1",
        agentId,
        currentContextTokens: null,
        currentModelProviderCredentialModelId: "model-row-1",
        currentModelId: "gpt-5.4",
        currentReasoningLevel: "high",
        inferredTitle: "Draft the onboarding email.",
        isCompacting: false,
        status: "queued",
        maxContextTokens: null,
        createdAt: new Date("2026-03-25T12:00:00.000Z"),
        updatedAt: new Date("2026-03-25T12:00:00.000Z"),
        userSetTitle: null,
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
    new AddAgentMutation(),
    new CreateSessionMutation(sessionManagerService as never),
    new AgentQueryResolver(),
    new AgentCreateOptionsQueryResolver(),
    new AgentsQueryResolver(),
    new DeleteAgentMutation(),
    new ModelProvidersQueryResolver(),
    new UpdateAgentMutation(),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        mutation CreateSession($input: CreateSessionInput!) {
          CreateSession(input: $input) {
            id
            agentId
            currentContextTokens
            isCompacting
            modelProviderCredentialModelId
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
      variables: {
        input: {
          agentId: "agent-1",
          images: [{
            base64EncodedImage: "encoded-image",
            mimeType: "image/png",
          }],
          modelProviderCredentialModelId: "model-row-1",
          reasoningLevel: "high",
          userMessage: "Draft the onboarding email.",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.CreateSession, {
    id: "session-1",
    agentId: "agent-1",
    currentContextTokens: null,
    isCompacting: false,
    modelProviderCredentialModelId: "model-row-1",
    modelId: "gpt-5.4",
    maxContextTokens: null,
    reasoningLevel: "high",
    inferredTitle: "Draft the onboarding email.",
    status: "queued",
    createdAt: "2026-03-25T12:00:00.000Z",
    updatedAt: "2026-03-25T12:00:00.000Z",
    userSetTitle: null,
  });

  await app.close();
});
