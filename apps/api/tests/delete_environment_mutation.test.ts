import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { DeleteEnvironmentMutation } from "../src/graphql/mutations/delete_environment.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import { AgentEnvironmentCatalogService } from "../src/services/agent/environment/catalog_service.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

class DeleteEnvironmentMutationTestHarness {
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
}

test("GraphQL DeleteEnvironment mutation deletes a company environment after provider teardown", async () => {
  const app = Fastify();
  const config = DeleteEnvironmentMutationTestHarness.createConfigMock();
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
  const providerDeleteEnvironment = vi.fn(async () => undefined);
  const catalogService = {
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
        updatedAt: new Date("2026-03-29T11:00:00.000Z"),
      };
    },
    async deleteEnvironment() {
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
        updatedAt: new Date("2026-03-29T11:00:00.000Z"),
      };
    },
  };

  const graphqlApplication = new GraphqlApplication(
    config,
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
  (
    graphqlApplication as unknown as {
      deleteEnvironmentMutation: DeleteEnvironmentMutation;
    }
  ).deleteEnvironmentMutation = new DeleteEnvironmentMutation(
    catalogService as unknown as AgentEnvironmentCatalogService,
    {
      async createShell() {
        throw new Error("createShell should not run for DeleteEnvironment");
      },
      deleteEnvironment: providerDeleteEnvironment,
      async getEnvironmentStatus() {
        return "running";
      },
      getProvider() {
        return "daytona";
      },
      async provisionEnvironment() {
        throw new Error("provisionEnvironment should not run for DeleteEnvironment");
      },
      supportsOnDemandProvisioning() {
        return true;
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
        mutation DeleteEnvironment($input: DeleteEnvironmentInput!) {
          DeleteEnvironment(input: $input) {
            id
            providerEnvironmentId
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
  assert.deepEqual(document.data.DeleteEnvironment, {
    id: "env-1",
    providerEnvironmentId: "daytona-env-1",
    status: "deleting",
  });
  assert.equal(providerDeleteEnvironment.mock.calls.length, 1);
  assert.equal(providerDeleteEnvironment.mock.calls[0]?.[1]?.id, "env-1");

  await app.close();
});

test("GraphQL DeleteEnvironment mutation force deletes a company environment when provider teardown fails", async () => {
  const app = Fastify();
  const config = DeleteEnvironmentMutationTestHarness.createConfigMock();
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
  const providerDeleteEnvironment = vi.fn(async () => {
    throw new Error("Sandbox state change in progress");
  });
  const catalogService = {
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
        updatedAt: new Date("2026-03-29T11:00:00.000Z"),
      };
    },
    async deleteEnvironment() {
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
        updatedAt: new Date("2026-03-29T11:00:00.000Z"),
      };
    },
  };

  const graphqlApplication = new GraphqlApplication(
    config,
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
  (
    graphqlApplication as unknown as {
      deleteEnvironmentMutation: DeleteEnvironmentMutation;
    }
  ).deleteEnvironmentMutation = new DeleteEnvironmentMutation(
    catalogService as unknown as AgentEnvironmentCatalogService,
    {
      async createShell() {
        throw new Error("createShell should not run for DeleteEnvironment");
      },
      deleteEnvironment: providerDeleteEnvironment,
      async getEnvironmentStatus() {
        return "running";
      },
      getProvider() {
        return "daytona";
      },
      async provisionEnvironment() {
        throw new Error("provisionEnvironment should not run for DeleteEnvironment");
      },
      supportsOnDemandProvisioning() {
        return true;
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
        mutation DeleteEnvironment($input: DeleteEnvironmentInput!) {
          DeleteEnvironment(input: $input) {
            id
            providerEnvironmentId
            status
          }
        }
      `,
      variables: {
        input: {
          force: true,
          id: "env-1",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.DeleteEnvironment, {
    id: "env-1",
    providerEnvironmentId: "daytona-env-1",
    status: "deleting",
  });
  assert.equal(providerDeleteEnvironment.mock.calls.length, 1);
  assert.equal(providerDeleteEnvironment.mock.calls[0]?.[1]?.id, "env-1");

  await app.close();
});
