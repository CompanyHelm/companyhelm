import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { GetEnvironmentVncUrlMutation } from "../src/graphql/mutations/get_environment_vnc_url.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import { AgentEnvironmentCatalogService } from "../src/services/agent/environment/catalog_service.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";
import type { DatabaseClientInterface } from "../src/db/database_interface.ts";

class GetEnvironmentVncUrlMutationTestHarness {
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
      GetEnvironmentVncUrlMutationTestHarness.createConfigMock(),
      new AddModelProviderCredentialMutation(modelManager as never),
      new DeleteModelProviderCredentialMutation(),
      new RefreshModelProviderCredentialModelsMutation(modelManager as never),
      new GraphqlRequestContextResolver(authProvider as never, {
        async withCompanyContext<T>(
          _companyId: string,
          callback: (database: DatabaseClientInterface) => Promise<T>,
        ): Promise<T> {
          return callback({} as DatabaseClientInterface);
        },
      } as never),
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
          cpuCount: 2,
          createdAt: new Date("2026-04-07T10:00:00.000Z"),
          diskSpaceGb: 20,
          displayName: "Research Ubuntu Box",
          id: "env-1",
          lastSeenAt: new Date("2026-04-07T11:00:00.000Z"),
          memoryGb: 4,
          metadata: {},
          platform: "linux" as const,
          provider: "e2b" as const,
          providerDefinitionId: "definition-1",
          providerEnvironmentId: "e2b-env-1",
          templateId: "medium",
          updatedAt: new Date("2026-04-07T11:00:00.000Z"),
        };
      },
    };
  }
}

test("GraphQL GetEnvironmentVncUrl mutation returns an on-demand desktop URL", async () => {
  const app = Fastify();
  const providerGetVncUrl = vi.fn(async (
    _transactionProvider: unknown,
    environment: {
      id: string;
    },
  ) => {
    assert.equal(environment.id, "env-1");
    return "https://desktop.example/vnc";
  });
  const graphqlApplication = GetEnvironmentVncUrlMutationTestHarness.createGraphqlApplication();

  (
    graphqlApplication as unknown as {
      getEnvironmentVncUrlMutation: GetEnvironmentVncUrlMutation;
    }
  ).getEnvironmentVncUrlMutation = new GetEnvironmentVncUrlMutation(
    GetEnvironmentVncUrlMutationTestHarness.createCatalogService() as unknown as AgentEnvironmentCatalogService,
    {
      async createShell() {
        throw new Error("createShell should not run for GetEnvironmentVncUrl");
      },
      async deleteEnvironment() {
        throw new Error("deleteEnvironment should not run for GetEnvironmentVncUrl");
      },
      async getEnvironmentStatus() {
        return "running";
      },
      getProvider() {
        return "e2b";
      },
      getVncUrl: providerGetVncUrl,
      async provisionEnvironment() {
        throw new Error("provisionEnvironment should not run for GetEnvironmentVncUrl");
      },
      supportsOnDemandProvisioning() {
        return true;
      },
      async startEnvironment() {
        throw new Error("startEnvironment should not run for GetEnvironmentVncUrl");
      },
      async stopEnvironment() {
        throw new Error("stopEnvironment should not run for GetEnvironmentVncUrl");
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
        mutation GetEnvironmentVncUrl($input: GetEnvironmentVncUrlInput!) {
          GetEnvironmentVncUrl(input: $input) {
            environmentId
            url
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
  assert.deepEqual(document.data.GetEnvironmentVncUrl, {
    environmentId: "env-1",
    url: "https://desktop.example/vnc",
  });
  assert.equal(providerGetVncUrl.mock.calls.length, 1);

  await app.close();
});
