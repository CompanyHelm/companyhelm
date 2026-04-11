import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlErrorLogger } from "../src/graphql/error_logger.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { CreateSessionMutation } from "../src/graphql/mutations/create_session.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

type LoggedErrorEntry = {
  bindings: Record<string, unknown>;
  message: string;
  payload: Record<string, unknown>;
};

class GraphqlErrorLoggerTestHarness {
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

  static createApiLoggerMock() {
    const entries: LoggedErrorEntry[] = [];

    return {
      entries,
      child(bindings: Record<string, unknown>) {
        return {
          error(payload: Record<string, unknown>, message: string) {
            entries.push({
              bindings,
              message,
              payload,
            });
          },
        };
      },
    };
  }
}

test("GraphQL logs backend failures before returning errors to the web", async () => {
  const app = Fastify();
  const config = GraphqlErrorLoggerTestHarness.createConfigMock();
  const database = GraphqlErrorLoggerTestHarness.createDatabaseMock();
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
  const apiLogger = GraphqlErrorLoggerTestHarness.createApiLoggerMock();
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
    new CreateSessionMutation({
      async createSession() {
        throw new Error("db insert failed");
      },
    } as never),
  );

  Reflect.set(graphqlApplication, "graphqlErrorLogger", new GraphqlErrorLogger(apiLogger as never));

  await graphqlApplication.register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      operationName: "CreateSession",
      query: `
        mutation CreateSession($input: CreateSessionInput!) {
          CreateSession(input: $input) {
            id
          }
        }
      `,
      variables: {
        input: {
          agentId: "agent-1",
          userMessage: "hi",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.data, null);
  assert.equal(document.errors[0]?.message, "db insert failed");
  assert.equal(apiLogger.entries.length, 1);
  assert.deepEqual(apiLogger.entries[0]?.bindings, {
    component: "graphql_error_logger",
  });
  assert.equal(apiLogger.entries[0]?.message, "graphql request failed");
  assert.equal(apiLogger.entries[0]?.payload.companyId, "company-123");
  assert.equal(apiLogger.entries[0]?.payload.userId, "user-123");
  assert.equal(apiLogger.entries[0]?.payload.requestMethod, "POST");
  assert.equal(apiLogger.entries[0]?.payload.requestUrl, "/graphql");
  assert.equal(apiLogger.entries[0]?.payload.operationName, "CreateSession");
  assert.equal((apiLogger.entries[0]?.payload.error as Error).message, "db insert failed");
  assert.match(String(apiLogger.entries[0]?.payload.query), /mutation CreateSession/);
  assert.equal((apiLogger.entries[0]?.payload.graphqlErrors as Array<{ message: string }>)[0]?.message, "db insert failed");

  await app.close();
});
