import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { StartEnvironmentMutation } from "../src/graphql/mutations/start_environment.ts";
import { StopEnvironmentMutation } from "../src/graphql/mutations/stop_environment.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import { AgentEnvironmentCatalogService } from "../src/services/environments/catalog_service.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

class StartStopEnvironmentMutationTestHarness {
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

  static createGraphqlApplication() {
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

    return new GraphqlApplication(
      StartStopEnvironmentMutationTestHarness.createConfigMock(),
      new AddModelProviderCredentialMutation(modelManager as never),
      new DeleteModelProviderCredentialMutation(),
      new RefreshModelProviderCredentialModelsMutation(modelManager as never),
      new GraphqlRequestContextResolver(authProvider as never, {
        async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
          return callback({});
        },
      }),
      new HealthQueryResolver(),
      new MeQueryResolver(),
      new ModelProviderCredentialModelsQueryResolver(),
      new ModelProviderCredentialsQueryResolver(),
    );
  }

  static createCatalogService() {
    return {
      async loadEnvironmentById() {
        return {
          agentId: "agent-1",
          companyId: "company-123",
          cpuCount: 4,
          createdAt: new Date("2026-03-29T10:00:00.000Z"),
          diskSpaceGb: 40,
          displayName: "Research Ubuntu Box",
          id: "env-1",
          lastSeenAt: new Date("2026-03-29T11:00:00.000Z"),
          memoryGb: 8,
          metadata: {},
          platform: "linux" as const,
          provider: "daytona" as const,
          providerEnvironmentId: "daytona-env-1",
          templateId: "daytona/default",
          updatedAt: new Date("2026-03-29T11:00:00.000Z"),
        };
      },
    };
  }
}

test("GraphQL StartEnvironment mutation starts a company environment through the provider", async () => {
  const app = Fastify();
  const providerStartEnvironment = vi.fn(async () => undefined);
  const graphqlApplication = StartStopEnvironmentMutationTestHarness.createGraphqlApplication();

  (
    graphqlApplication as unknown as {
      startEnvironmentMutation: StartEnvironmentMutation;
    }
  ).startEnvironmentMutation = new StartEnvironmentMutation(
    StartStopEnvironmentMutationTestHarness.createCatalogService() as unknown as AgentEnvironmentCatalogService,
    {
      async createShell() {
        throw new Error("createShell should not run for StartEnvironment");
      },
      async deleteEnvironment() {
        throw new Error("deleteEnvironment should not run for StartEnvironment");
      },
      async getEnvironmentStatus() {
        return "stopped";
      },
      getProvider() {
        return "daytona";
      },
      async provisionEnvironment() {
        throw new Error("provisionEnvironment should not run for StartEnvironment");
      },
      supportsOnDemandProvisioning() {
        return true;
      },
      startEnvironment: providerStartEnvironment,
      async stopEnvironment() {
        throw new Error("stopEnvironment should not run for StartEnvironment");
      },
    } as never,
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
        mutation StartEnvironment($input: StartEnvironmentInput!) {
          StartEnvironment(input: $input) {
            id
            status
          }
        }
      `,
      variables: {
        input: {
          id: "env-1",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.StartEnvironment, {
    id: "env-1",
    status: "running",
  });
  assert.equal(providerStartEnvironment.mock.calls.length, 1);
  assert.equal(providerStartEnvironment.mock.calls[0]?.[1]?.id, "env-1");

  await app.close();
});

test("GraphQL StopEnvironment mutation stops a company environment through the provider", async () => {
  const app = Fastify();
  const providerStopEnvironment = vi.fn(async () => undefined);
  const graphqlApplication = StartStopEnvironmentMutationTestHarness.createGraphqlApplication();

  (
    graphqlApplication as unknown as {
      stopEnvironmentMutation: StopEnvironmentMutation;
    }
  ).stopEnvironmentMutation = new StopEnvironmentMutation(
    StartStopEnvironmentMutationTestHarness.createCatalogService() as unknown as AgentEnvironmentCatalogService,
    {
      async createShell() {
        throw new Error("createShell should not run for StopEnvironment");
      },
      async deleteEnvironment() {
        throw new Error("deleteEnvironment should not run for StopEnvironment");
      },
      async getEnvironmentStatus() {
        return "running";
      },
      getProvider() {
        return "daytona";
      },
      async provisionEnvironment() {
        throw new Error("provisionEnvironment should not run for StopEnvironment");
      },
      supportsOnDemandProvisioning() {
        return true;
      },
      async startEnvironment() {
        throw new Error("startEnvironment should not run for StopEnvironment");
      },
      stopEnvironment: providerStopEnvironment,
    } as never,
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
        mutation StopEnvironment($input: StopEnvironmentInput!) {
          StopEnvironment(input: $input) {
            id
            status
          }
        }
      `,
      variables: {
        input: {
          id: "env-1",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.StopEnvironment, {
    id: "env-1",
    status: "stopped",
  });
  assert.equal(providerStopEnvironment.mock.calls.length, 1);
  assert.equal(providerStopEnvironment.mock.calls[0]?.[1]?.id, "env-1");

  await app.close();
});
