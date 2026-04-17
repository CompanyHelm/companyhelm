import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { CreateEnvironmentTerminalConnectionMutation } from "../src/graphql/mutations/create_environment_terminal_connection.ts";
import { EnvironmentTerminalConnectionTokenService } from "../src/services/environments/terminal/connection_token_service.ts";
import type { AgentEnvironmentCatalogService } from "../src/services/environments/catalog_service.ts";
import type { AgentEnvironmentRecord } from "../src/services/environments/providers/provider_interface.ts";

class CreateEnvironmentTerminalConnectionMutationTestHarness {
  static createConfig(): Config {
    return {
      publicUrl: "https://api.companyhelm.test",
    } as Config;
  }

  static createContext(): GraphqlRequestContext {
    return {
      app_runtime_transaction_provider: {} as never,
      authSession: {
        company: {
          id: "company-123",
          name: "Example Company",
        },
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-clerk:123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
      },
      redisCompanyScopedService: null,
    };
  }

  static createCatalogService(environment: AgentEnvironmentRecord): AgentEnvironmentCatalogService {
    return {
      async loadEnvironmentById(_transactionProvider: unknown, environmentId: string) {
        assert.equal(environmentId, "env-1");
        return environment;
      },
    } as unknown as AgentEnvironmentCatalogService;
  }

  static createEnvironment(): AgentEnvironmentRecord {
    return {
      agentId: "agent-1",
      companyId: "company-123",
      cpuCount: 2,
      createdAt: new Date("2026-04-16T10:00:00.000Z"),
      diskSpaceGb: 20,
      displayName: "Terminal Ubuntu Box",
      id: "env-1",
      lastSeenAt: new Date("2026-04-16T11:00:00.000Z"),
      memoryGb: 4,
      metadata: {},
      platform: "linux",
      provider: "e2b",
      providerDefinitionId: "definition-1",
      providerEnvironmentId: "e2b-env-1",
      templateId: "e2b/desktop",
      updatedAt: new Date("2026-04-16T11:00:00.000Z"),
    };
  }
}

test("CreateEnvironmentTerminalConnection returns a one-time websocket grant for an E2B environment", async () => {
  const tokenService = new EnvironmentTerminalConnectionTokenService();
  const mutation = new CreateEnvironmentTerminalConnectionMutation(
    CreateEnvironmentTerminalConnectionMutationTestHarness.createConfig(),
    CreateEnvironmentTerminalConnectionMutationTestHarness.createCatalogService(
      CreateEnvironmentTerminalConnectionMutationTestHarness.createEnvironment(),
    ),
    tokenService,
  );

  const result = await mutation.execute(
    null,
    {
      input: {
        columns: 500,
        id: "env-1",
        rows: 2,
      },
    },
    CreateEnvironmentTerminalConnectionMutationTestHarness.createContext(),
  );

  assert.equal(result.environmentId, "env-1");
  assert.equal(result.terminalSessionId, "companyhelm-web-userclerk123");
  assert.match(result.expiresAt, /^\d{4}-\d{2}-\d{2}T/u);

  const websocketUrl = new URL(result.websocketUrl);
  assert.equal(websocketUrl.protocol, "wss:");
  assert.equal(websocketUrl.host, "api.companyhelm.test");
  assert.equal(websocketUrl.pathname, "/environment-terminal");

  const token = websocketUrl.searchParams.get("token");
  assert.ok(token);
  const grant = tokenService.consumeGrant(token);
  assert.deepEqual(grant, {
    columns: 300,
    companyId: "company-123",
    environmentId: "env-1",
    expiresAt: new Date(result.expiresAt),
    rows: 8,
    terminalSessionId: "companyhelm-web-userclerk123",
    userId: "user-clerk:123",
  });
  assert.equal(tokenService.consumeGrant(token), null);
});

test("CreateEnvironmentTerminalConnection rejects environments outside the authenticated company", async () => {
  const tokenService = new EnvironmentTerminalConnectionTokenService();
  const environment = {
    ...CreateEnvironmentTerminalConnectionMutationTestHarness.createEnvironment(),
    companyId: "other-company",
  };
  const mutation = new CreateEnvironmentTerminalConnectionMutation(
    CreateEnvironmentTerminalConnectionMutationTestHarness.createConfig(),
    CreateEnvironmentTerminalConnectionMutationTestHarness.createCatalogService(environment),
    tokenService,
  );

  await assert.rejects(
    () => mutation.execute(
      null,
      {
        input: {
          id: "env-1",
        },
      },
      CreateEnvironmentTerminalConnectionMutationTestHarness.createContext(),
    ),
    /Environment not found/u,
  );
});
