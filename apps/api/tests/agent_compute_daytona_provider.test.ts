import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentComputeDaytonaProvider } from "../src/services/environments/providers/daytona/daytona_provider.ts";
import { AgentEnvironmentCatalogService } from "../src/services/environments/catalog_service.ts";

function createComputeProviderDefinitionService() {
  return {
    async loadRuntimeDefinitionById() {
      return {
        apiKey: "daytona-api-key",
        apiUrl: "https://app.daytona.io/api",
        companyId: "company-1",
        description: null,
        id: "compute-provider-definition-1",
        name: "Primary Daytona",
        provider: "daytona" as const,
      };
    },
  };
}

function createDaytonaProvider(catalogService: AgentEnvironmentCatalogService = {} as AgentEnvironmentCatalogService) {
  return new AgentComputeDaytonaProvider(
    catalogService,
    createComputeProviderDefinitionService() as never,
  );
}

function createEnvironmentRecord(overrides: Partial<{
  cpuCount: number;
  diskSpaceGb: number;
  displayName: string | null;
  id: string;
  memoryGb: number;
  providerEnvironmentId: string;
}> = {}) {
  return {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: overrides.cpuCount ?? 4,
    createdAt: new Date("2026-03-27T20:00:00.000Z"),
    diskSpaceGb: overrides.diskSpaceGb ?? 10,
    displayName: overrides.displayName ?? null,
    id: overrides.id ?? "environment-1",
    lastSeenAt: null,
    memoryGb: overrides.memoryGb ?? 8,
    metadata: {},
    platform: "linux" as const,
    provider: "daytona" as const,
    providerDefinitionId: "compute-provider-definition-1",
    providerEnvironmentId: overrides.providerEnvironmentId ?? "daytona-environment-1",
    updatedAt: new Date("2026-03-27T20:00:00.000Z"),
  };
}

test("AgentComputeDaytonaProvider provisions Daytona environments on demand with generic metadata", async () => {
  const create = vi.fn(async () => ({
    cpu: 4,
    delete: vi.fn(async () => undefined),
    disk: 10,
    id: "daytona-environment-1",
    memory: 8,
  }));
  const provider = createDaytonaProvider();
  (provider as unknown as {
    createDaytonaClient(): {
      create: typeof create;
    };
  }).createDaytonaClient = () => ({
    create,
  });

  const provisionedEnvironment = await provider.provisionEnvironment({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    providerDefinitionId: "compute-provider-definition-1",
    template: {
      computerUse: false,
      cpuCount: 6,
      diskSpaceGb: 24,
      memoryGb: 12,
      name: "Large",
      templateId: "daytona/large",
    },
    sessionId: "session-1",
  });

  assert.equal(provider.getProvider(), "daytona");
  assert.equal(provider.supportsOnDemandProvisioning(), true);
  assert.equal(create.mock.calls.length, 1);
  assert.deepEqual(create.mock.calls[0]?.[0], {
    image: "node:20-slim",
    resources: {
      cpu: 6,
      disk: 24,
      memory: 12,
    },
  });
  assert.equal(provisionedEnvironment.providerEnvironmentId, "daytona-environment-1");
  assert.equal(provisionedEnvironment.platform, "linux");
  assert.deepEqual(provisionedEnvironment.metadata, {});
  assert.equal(provisionedEnvironment.cpuCount, 4);
  assert.equal(provisionedEnvironment.diskSpaceGb, 10);
  assert.equal(provisionedEnvironment.memoryGb, 8);
});

test("AgentComputeDaytonaProvider maps remote sandbox state into generic environment status", async () => {
  const refreshData = vi.fn(async () => undefined);
  const provider = createDaytonaProvider();
  (provider as unknown as {
    createDaytonaClient(): {
      get: (id: string) => Promise<unknown>;
    };
  }).createDaytonaClient = () => ({
    async get(id: string) {
      assert.equal(id, "daytona-environment-status");
      return {
        refreshData,
        state: "started",
      };
    },
  });

  const status = await provider.getEnvironmentStatus(
    {} as never,
    createEnvironmentRecord({
      id: "environment-status",
      providerEnvironmentId: "daytona-environment-status",
    }),
  );

  assert.equal(refreshData.mock.calls.length, 1);
  assert.equal(status, "running");
});

test("AgentComputeDaytonaProvider deletes the remote Daytona sandbox for an environment", async () => {
  const deleteSandbox = vi.fn(async () => undefined);
  const provider = createDaytonaProvider();
  (provider as unknown as {
    createDaytonaClient(): {
      get: (id: string) => Promise<unknown>;
    };
  }).createDaytonaClient = () => ({
    async get(id: string) {
      assert.equal(id, "daytona-environment-delete");
      return {
        delete: deleteSandbox,
      };
    },
  });

  await provider.deleteEnvironment(
    {} as never,
    createEnvironmentRecord({
      id: "environment-delete",
      providerEnvironmentId: "daytona-environment-delete",
    }),
  );

  assert.equal(deleteSandbox.mock.calls.length, 1);
});

test("AgentComputeDaytonaProvider ignores missing remote sandboxes during deletion", async () => {
  const provider = createDaytonaProvider();
  (provider as unknown as {
    createDaytonaClient(): {
      get: (id: string) => Promise<unknown>;
    };
  }).createDaytonaClient = () => ({
    async get(id: string) {
      assert.equal(id, "daytona-environment-missing");
      throw new Error("Sandbox not found");
    },
  });

  await provider.deleteEnvironment(
    {} as never,
    createEnvironmentRecord({
      id: "environment-missing",
      providerEnvironmentId: "daytona-environment-missing",
    }),
  );
});

test("AgentComputeDaytonaProvider starts a stopped sandbox on demand", async () => {
  const refreshData = vi.fn(async () => undefined);
  const start = vi.fn(async function(this: { state: string }) {
    this.state = "started";
  });
  const provider = createDaytonaProvider();
  (provider as unknown as {
    createDaytonaClient(): {
      get: (id: string) => Promise<unknown>;
    };
  }).createDaytonaClient = () => ({
    async get(id: string) {
      assert.equal(id, "daytona-environment-start");
      return {
        refreshData,
        start,
        state: "stopped",
      };
    },
  });

  await provider.startEnvironment({} as never, createEnvironmentRecord({
    cpuCount: 4,
    diskSpaceGb: 10,
    id: "environment-start",
    memoryGb: 8,
    providerEnvironmentId: "daytona-environment-start",
  }));

  assert.equal(start.mock.calls.length, 1);
  assert.equal(refreshData.mock.calls.length, 2);
});

test("AgentComputeDaytonaProvider stops a running sandbox on demand", async () => {
  const refreshData = vi.fn(async () => undefined);
  const stop = vi.fn(async function(this: { state: string }) {
    this.state = "stopped";
  });
  const provider = createDaytonaProvider();
  (provider as unknown as {
    createDaytonaClient(): {
      get: (id: string) => Promise<unknown>;
    };
  }).createDaytonaClient = () => ({
    async get(id: string) {
      assert.equal(id, "daytona-environment-stop");
      return {
        refreshData,
        state: "started",
        stop,
      };
    },
  });

  await provider.stopEnvironment({} as never, createEnvironmentRecord({
    cpuCount: 4,
    diskSpaceGb: 10,
    id: "environment-stop",
    memoryGb: 8,
    providerEnvironmentId: "daytona-environment-stop",
  }));

  assert.equal(stop.mock.calls.length, 1);
  assert.equal(refreshData.mock.calls.length, 2);
});

test("AgentComputeDaytonaProvider starts stopped environments and updates the catalog before creating the runtime", async () => {
  const refreshData = vi.fn(async () => undefined);
  const start = vi.fn(async () => undefined);
  const executeCommand = vi.fn(async () => ({
    exitCode: 0,
    result: "",
  }));
  const updateEnvironmentResources = vi.fn(async () => ({
    id: "environment-1",
  }));
  const provider = createDaytonaProvider({
    updateEnvironmentResources,
  } as unknown as AgentEnvironmentCatalogService);
  (provider as unknown as {
    createDaytonaClient(): {
      get: (id: string) => Promise<unknown>;
    };
  }).createDaytonaClient = () => ({
    async get(id: string) {
      assert.equal(id, "daytona-environment-1");
      return {
        cpu: 3,
        disk: 25,
        memory: 5,
        state: "stopped",
        process: {
          executeCommand,
        },
        refreshData,
        start,
      };
    },
  });

  const shell = await provider.createShell({} as never, createEnvironmentRecord({
    cpuCount: 2,
    diskSpaceGb: 20,
    id: "environment-1",
    memoryGb: 4,
    providerEnvironmentId: "daytona-environment-1",
  }));

  assert.equal(start.mock.calls.length, 1);
  assert.equal(refreshData.mock.calls.length, 2);
  assert.equal(updateEnvironmentResources.mock.calls.length, 1);
  assert.deepEqual(await shell.executeCommand("echo ready"), {
    exitCode: 0,
    stdout: "",
  });
});

test("AgentComputeDaytonaProvider starts a remotely stopped sandbox even when the catalog says it is running", async () => {
  const refreshData = vi.fn(async () => undefined);
  const start = vi.fn(async function(this: { state: string }) {
    this.state = "started";
  });
  const executeCommand = vi.fn(async () => ({
    exitCode: 0,
    result: "",
  }));
  const updateEnvironmentResources = vi.fn(async () => ({
    id: "environment-2",
  }));
  const provider = createDaytonaProvider({
    updateEnvironmentResources,
  } as unknown as AgentEnvironmentCatalogService);
  (provider as unknown as {
    createDaytonaClient(): {
      get: (id: string) => Promise<unknown>;
    };
  }).createDaytonaClient = () => ({
    async get(id: string) {
      assert.equal(id, "daytona-environment-2");
      return {
        cpu: 4,
        disk: 10,
        memory: 8,
        state: "stopped",
        process: {
          executeCommand,
        },
        refreshData,
        start,
      };
    },
  });

  const shell = await provider.createShell({} as never, createEnvironmentRecord({
    cpuCount: 4,
    diskSpaceGb: 10,
    id: "environment-2",
    memoryGb: 8,
    providerEnvironmentId: "daytona-environment-2",
  }));

  assert.equal(start.mock.calls.length, 1);
  assert.equal(refreshData.mock.calls.length, 2);
  assert.equal(updateEnvironmentResources.mock.calls.length, 0);
  assert.deepEqual(await shell.executeCommand("echo ready"), {
    exitCode: 0,
    stdout: "",
  });
});
