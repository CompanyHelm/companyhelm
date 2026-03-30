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
import { DeleteEnvironmentMutation } from "../src/graphql/mutations/delete_environment.ts";
import { DeleteAgentMutation } from "../src/graphql/mutations/delete_agent.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { PromptSessionMutation } from "../src/graphql/mutations/prompt_session.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { StartEnvironmentMutation } from "../src/graphql/mutations/start_environment.ts";
import { StopEnvironmentMutation } from "../src/graphql/mutations/stop_environment.ts";
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

class PromptSessionMutationTestHarness {
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

test("GraphQL PromptSession mutation queues a new session message and returns the updated session", async () => {
  const app = Fastify();
  const config = PromptSessionMutationTestHarness.createConfigMock();
  const database = PromptSessionMutationTestHarness.createDatabaseMock();
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
    async prompt(
      transactionProvider: unknown,
      companyId: string,
      sessionId: string,
      userMessage: string,
      modelProviderCredentialModelId: string | null | undefined,
      reasoningLevel: string | null | undefined,
      shouldSteer: boolean,
    ) {
      assert.ok(transactionProvider);
      assert.equal(companyId, "company-123");
      assert.equal(sessionId, "session-1");
      assert.equal(userMessage, "Focus on the failed deploy.");
      assert.equal(modelProviderCredentialModelId, "model-row-9");
      assert.equal(reasoningLevel, "medium");
      assert.equal(shouldSteer, true);

      return {
        id: "session-1",
        agentId: "agent-1",
        currentModelProviderCredentialModelId: "model-row-9",
        currentModelId: "gpt-5.4",
        currentReasoningLevel: "medium",
        inferredTitle: "Existing title",
        isThinking: false,
        status: "running",
        thinkingText: null,
        createdAt: new Date("2026-03-25T12:00:00.000Z"),
        updatedAt: new Date("2026-03-25T12:05:00.000Z"),
        userSetTitle: null,
      };
    },
  };

  await new GraphqlApplication(
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
    new CreateSessionMutation({
      async createSession() {
        throw new Error("CreateSession should not be called.");
      },
    } as never),
    new AgentQueryResolver(),
    new AgentCreateOptionsQueryResolver(),
    new AgentsQueryResolver(),
    new DeleteAgentMutation(),
    new DeleteEnvironmentMutation(),
    new StartEnvironmentMutation(),
    new StopEnvironmentMutation(),
    new ModelProvidersQueryResolver(),
    new UpdateAgentMutation(),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    new PromptSessionMutation(sessionManagerService as never),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        mutation PromptSession($input: PromptSessionInput!) {
          PromptSession(input: $input) {
            id
            agentId
            modelProviderCredentialModelId
            modelId
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
          id: "session-1",
          modelProviderCredentialModelId: "model-row-9",
          reasoningLevel: "medium",
          shouldSteer: true,
          userMessage: "Focus on the failed deploy.",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.PromptSession, {
    id: "session-1",
    agentId: "agent-1",
    modelProviderCredentialModelId: "model-row-9",
    modelId: "gpt-5.4",
    reasoningLevel: "medium",
    inferredTitle: "Existing title",
    status: "running",
    createdAt: "2026-03-25T12:00:00.000Z",
    updatedAt: "2026-03-25T12:05:00.000Z",
    userSetTitle: null,
  });

  await app.close();
});

test("GraphQL PromptSession mutation rejects archived sessions", async () => {
  const app = Fastify();
  const config = PromptSessionMutationTestHarness.createConfigMock();
  const database = PromptSessionMutationTestHarness.createDatabaseMock();
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
    async prompt() {
      throw new Error("Archived sessions cannot receive new messages.");
    },
  };

  await new GraphqlApplication(
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
    new CreateSessionMutation({
      async createSession() {
        throw new Error("CreateSession should not be called.");
      },
    } as never),
    new AgentQueryResolver(),
    new AgentCreateOptionsQueryResolver(),
    new AgentsQueryResolver(),
    new DeleteAgentMutation(),
    new DeleteEnvironmentMutation(),
    new StartEnvironmentMutation(),
    new StopEnvironmentMutation(),
    new ModelProvidersQueryResolver(),
    new UpdateAgentMutation(),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    new PromptSessionMutation(sessionManagerService as never),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        mutation PromptSession($input: PromptSessionInput!) {
          PromptSession(input: $input) {
            id
          }
        }
      `,
      variables: {
        input: {
          id: "session-1",
          userMessage: "Focus on the failed deploy.",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.data, null);
  assert.equal(document.errors[0]?.message, "Archived sessions cannot receive new messages.");

  await app.close();
});
