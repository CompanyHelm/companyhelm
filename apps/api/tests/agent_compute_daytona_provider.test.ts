import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentComputeDaytonaProvider } from "../src/services/agent/compute/daytona/daytona_provider.ts";
import { AgentEnvironmentCatalogService } from "../src/services/agent/environment/catalog_service.ts";

test("AgentComputeDaytonaProvider provisions Daytona environments on demand with generic metadata", async () => {
  const create = vi.fn(async () => ({
    cpu: 4,
    delete: vi.fn(async () => undefined),
    disk: 10,
    id: "daytona-environment-1",
    memory: 8,
  }));
  const provider = new AgentComputeDaytonaProvider(
    {
      daytona: {
        api_key: "daytona-api-key",
        api_url: "https://app.daytona.io/api",
        cpu_count: 4,
        disk_gb: 10,
        memory_gb: 8,
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
  assert.deepEqual(create.mock.calls[0]?.[0], {
    image: "node:20-slim",
    resources: {
      cpu: 4,
      disk: 10,
      memory: 8,
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
  const provider = new AgentComputeDaytonaProvider(
    {
      daytona: {
        api_key: "daytona-api-key",
        api_url: "https://app.daytona.io/api",
        cpu_count: 4,
        disk_gb: 10,
        memory_gb: 8,
      },
    } as never,
    {} as AgentEnvironmentCatalogService,
  );
  (provider as {
    daytona: {
      get: (id: string) => Promise<unknown>;
    };
  }).daytona = {
    async get(id: string) {
      assert.equal(id, "daytona-environment-status");
      return {
        refreshData,
        state: "started",
      };
    },
  };

  const status = await provider.getEnvironmentStatus({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 4,
    createdAt: new Date("2026-03-27T20:00:00.000Z"),
    diskSpaceGb: 10,
    displayName: null,
    id: "environment-status",
    lastSeenAt: null,
    memoryGb: 8,
    metadata: {},
    platform: "linux",
    provider: "daytona",
    providerEnvironmentId: "daytona-environment-status",
    updatedAt: new Date("2026-03-27T20:00:00.000Z"),
  });

  assert.equal(refreshData.mock.calls.length, 1);
  assert.equal(status, "running");
});

test("AgentComputeDaytonaProvider deletes the remote Daytona sandbox for an environment", async () => {
  const deleteSandbox = vi.fn(async () => undefined);
  const provider = new AgentComputeDaytonaProvider(
    {
      daytona: {
        api_key: "daytona-api-key",
        api_url: "https://app.daytona.io/api",
        cpu_count: 4,
        disk_gb: 10,
        memory_gb: 8,
      },
    } as never,
    {} as AgentEnvironmentCatalogService,
  );
  (provider as {
    daytona: {
      get: (id: string) => Promise<unknown>;
    };
  }).daytona = {
    async get(id: string) {
      assert.equal(id, "daytona-environment-delete");
      return {
        delete: deleteSandbox,
      };
    },
  };

  await provider.deleteEnvironment({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 4,
    createdAt: new Date("2026-03-27T20:00:00.000Z"),
    diskSpaceGb: 10,
    displayName: null,
    id: "environment-delete",
    lastSeenAt: null,
    memoryGb: 8,
    metadata: {},
    platform: "linux",
    provider: "daytona",
    providerEnvironmentId: "daytona-environment-delete",
    updatedAt: new Date("2026-03-27T20:00:00.000Z"),
  });

  assert.equal(deleteSandbox.mock.calls.length, 1);
});

test("AgentComputeDaytonaProvider ignores missing remote sandboxes during deletion", async () => {
  const provider = new AgentComputeDaytonaProvider(
    {
      daytona: {
        api_key: "daytona-api-key",
        api_url: "https://app.daytona.io/api",
        cpu_count: 4,
        disk_gb: 10,
        memory_gb: 8,
      },
    } as never,
    {} as AgentEnvironmentCatalogService,
  );
  (provider as {
    daytona: {
      get: (id: string) => Promise<unknown>;
    };
  }).daytona = {
    async get(id: string) {
      assert.equal(id, "daytona-environment-missing");
      throw new Error("Sandbox not found");
    },
  };

  await provider.deleteEnvironment({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 4,
    createdAt: new Date("2026-03-27T20:00:00.000Z"),
    diskSpaceGb: 10,
    displayName: null,
    id: "environment-missing",
    lastSeenAt: null,
    memoryGb: 8,
    metadata: {},
    platform: "linux",
    provider: "daytona",
    providerEnvironmentId: "daytona-environment-missing",
    updatedAt: new Date("2026-03-27T20:00:00.000Z"),
  });
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
  const provider = new AgentComputeDaytonaProvider(
    {
      daytona: {
        api_key: "daytona-api-key",
        api_url: "https://app.daytona.io/api",
        cpu_count: 4,
        disk_gb: 10,
        memory_gb: 8,
      },
    } as never,
    {
      updateEnvironmentResources,
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
        state: "stopped",
        process: {
          executeCommand,
        },
        refreshData,
        start,
      };
    },
  };

  const shell = await provider.createShell({} as never, {
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
    updatedAt: new Date("2026-03-27T20:00:00.000Z"),
  });

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
  const provider = new AgentComputeDaytonaProvider(
    {
      daytona: {
        api_key: "daytona-api-key",
        api_url: "https://app.daytona.io/api",
        cpu_count: 4,
        disk_gb: 10,
        memory_gb: 8,
      },
    } as never,
    {
      updateEnvironmentResources,
    } as unknown as AgentEnvironmentCatalogService,
  );
  (provider as {
    daytona: {
      get: (id: string) => Promise<unknown>;
    };
  }).daytona = {
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
  };

  const shell = await provider.createShell({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 4,
    createdAt: new Date("2026-03-27T20:00:00.000Z"),
    diskSpaceGb: 10,
    displayName: null,
    id: "environment-2",
    lastSeenAt: null,
    memoryGb: 8,
    metadata: {},
    platform: "linux",
    provider: "daytona",
    providerEnvironmentId: "daytona-environment-2",
    updatedAt: new Date("2026-03-27T20:00:00.000Z"),
  });

  assert.equal(start.mock.calls.length, 1);
  assert.equal(refreshData.mock.calls.length, 2);
  assert.equal(updateEnvironmentResources.mock.calls.length, 0);
  assert.deepEqual(await shell.executeCommand("echo ready"), {
    exitCode: 0,
    stdout: "",
  });
});
