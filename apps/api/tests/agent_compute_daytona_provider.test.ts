import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentComputeDaytonaProvider } from "../src/services/agent/compute/daytona/daytona_provider.ts";
import { AgentEnvironmentCatalogService } from "../src/services/agent/environment/catalog_service.ts";

test("AgentComputeDaytonaProvider provisions Daytona environments on demand with generic metadata", async () => {
  const create = vi.fn(async () => ({
    cpu: 2,
    delete: vi.fn(async () => undefined),
    disk: 20,
    id: "daytona-environment-1",
    memory: 4,
  }));
  const provider = new AgentComputeDaytonaProvider(
    {
      daytona: {
        api_key: "daytona-api-key",
      },
    } as never,
    {} as AgentEnvironmentCatalogService,
  );
  (provider as { daytona: { create: typeof create } }).daytona = {
    create,
  } as never;

  const provisionedEnvironment = await provider.provisionEnvironment({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    sessionId: "session-1",
  });

  assert.equal(provider.getProvider(), "daytona");
  assert.equal(provider.supportsOnDemandProvisioning(), true);
  assert.equal(create.mock.calls.length, 1);
  assert.equal(provisionedEnvironment.providerEnvironmentId, "daytona-environment-1");
  assert.equal(provisionedEnvironment.platform, "linux");
  assert.deepEqual(provisionedEnvironment.metadata, {});
});

test("AgentComputeDaytonaProvider starts stopped environments and updates the catalog before creating the runtime", async () => {
  const refreshData = vi.fn(async () => undefined);
  const start = vi.fn(async () => undefined);
  const executeCommand = vi.fn(async () => ({
    exitCode: 0,
    result: "",
  }));
  const updateRuntimeState = vi.fn(async () => ({
    id: "environment-1",
  }));
  const provider = new AgentComputeDaytonaProvider(
    {
      daytona: {
        api_key: "daytona-api-key",
      },
    } as never,
    {
      updateRuntimeState,
    } as unknown as AgentEnvironmentCatalogService,
  );
  (provider as {
    daytona: {
      get: (id: string) => Promise<unknown>;
    };
  }).daytona = {
    async get(id: string) {
      assert.equal(id, "daytona-environment-1");
      return {
        cpu: 3,
        disk: 25,
        memory: 5,
        process: {
          executeCommand,
        },
        refreshData,
        start,
      };
    },
  };

  const runtime = await provider.createRuntime({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 2,
    createdAt: new Date("2026-03-27T20:00:00.000Z"),
    diskSpaceGb: 20,
    displayName: null,
    id: "environment-1",
    lastSeenAt: null,
    memoryGb: 4,
    metadata: {},
    platform: "linux",
    provider: "daytona",
    providerEnvironmentId: "daytona-environment-1",
    status: "stopped",
    updatedAt: new Date("2026-03-27T20:00:00.000Z"),
  });

  assert.equal(start.mock.calls.length, 1);
  assert.equal(refreshData.mock.calls.length, 1);
  assert.equal(updateRuntimeState.mock.calls.length, 1);
  assert.deepEqual(await runtime.listSessions(), []);
});
