import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentAccessService } from "../src/services/agent/environment/access_service.ts";

test("AgentEnvironmentAccessService reactivates the current session lease before consulting history or provisioning", async () => {
  const activateLease = vi.fn(async () => ({
    id: "lease-1",
  }));
  const createRuntime = vi.fn(async () => ({
    async closeSession() {},
    async dispose() {},
    async executeCommand() {
      throw new Error("not used");
    },
    async killSession() {},
    async listSessions() {
      return [];
    },
    async readOutput() {
      return {
        chunks: [],
        nextOffset: null,
      };
    },
    async resizeSession() {},
    async sendInput() {
      throw new Error("not used");
    },
  }));
  const service = new AgentEnvironmentAccessService(
    {
      async loadEnvironmentById() {
        return {
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
        };
      },
      async loadSession() {
        return {
          agentId: "agent-1",
          companyId: "company-1",
          id: "session-1",
        };
      },
    } as never,
    {
      activateLease,
      async expireElapsedLeases() {
        return undefined;
      },
      async findOpenLeaseForSession() {
        return {
          environmentId: "environment-1",
          id: "lease-1",
        };
      },
    } as never,
    {
      createRuntime,
      getProvider() {
        return "daytona";
      },
    } as never,
    {
      async provisionEnvironmentForSession() {
        throw new Error("provisioning should not run when a session lease exists");
      },
    } as never,
    {
      async findReusableEnvironmentForAgentSession() {
        throw new Error("history lookup should not run when a session lease exists");
      },
    } as never,
  );

  const environment = await service.getEnvironmentForSession({} as never, "agent-1", "session-1");

  assert.equal(activateLease.mock.calls.length, 1);
  assert.equal(createRuntime.mock.calls.length, 1);
  assert.deepEqual(await environment.listSessions(), []);
});

test("AgentEnvironmentAccessService prefers historical reuse before provisioning a new environment", async () => {
  const acquireLease = vi.fn(async () => ({
    id: "lease-2",
  }));
  const createRuntime = vi.fn(async () => ({
    async closeSession() {},
    async dispose() {},
    async executeCommand() {
      throw new Error("not used");
    },
    async killSession() {},
    async listSessions() {
      return [];
    },
    async readOutput() {
      return {
        chunks: [],
        nextOffset: null,
      };
    },
    async resizeSession() {},
    async sendInput() {
      throw new Error("not used");
    },
  }));
  const historicalEnvironment = {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 2,
    createdAt: new Date("2026-03-27T20:00:00.000Z"),
    diskSpaceGb: 20,
    displayName: null,
    id: "environment-2",
    lastSeenAt: null,
    memoryGb: 4,
    metadata: {},
    platform: "linux" as const,
    provider: "daytona" as const,
    providerEnvironmentId: "daytona-environment-2",
    updatedAt: new Date("2026-03-27T20:00:00.000Z"),
  };
  const service = new AgentEnvironmentAccessService(
    {
      async loadSession() {
        return {
          agentId: "agent-1",
          companyId: "company-1",
          id: "session-1",
        };
      },
    } as never,
    {
      acquireLease,
      async expireElapsedLeases() {
        return undefined;
      },
      async findOpenLeaseForSession() {
        return null;
      },
      async markLeaseIdle() {
        return undefined;
      },
    } as never,
    {
      createRuntime,
      getProvider() {
        return "daytona";
      },
    } as never,
    {
      async provisionEnvironmentForSession() {
        throw new Error("provisioning should not run when a historical environment is reusable");
      },
    } as never,
    {
      async findReusableEnvironmentForAgentSession() {
        return historicalEnvironment;
      },
    } as never,
  );

  const environment = await service.getEnvironmentForSession({} as never, "agent-1", "session-1");

  assert.equal(acquireLease.mock.calls.length, 1);
  assert.equal(createRuntime.mock.calls.length, 1);
  assert.equal(createRuntime.mock.calls[0]?.[1]?.id, "environment-2");
  await environment.dispose();
});

test("AgentEnvironmentAccessService provisions a new environment when no reusable history exists", async () => {
  const acquireLease = vi.fn(async () => ({
    id: "lease-3",
  }));
  const createRuntime = vi.fn(async () => ({
    async closeSession() {},
    async dispose() {},
    async executeCommand() {
      throw new Error("not used");
    },
    async killSession() {},
    async listSessions() {
      return [];
    },
    async readOutput() {
      return {
        chunks: [],
        nextOffset: null,
      };
    },
    async resizeSession() {},
    async sendInput() {
      throw new Error("not used");
    },
  }));
  const provisionedEnvironment = {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 2,
    createdAt: new Date("2026-03-27T20:00:00.000Z"),
    diskSpaceGb: 20,
    displayName: null,
    id: "environment-3",
    lastSeenAt: null,
    memoryGb: 4,
    metadata: {},
    platform: "linux" as const,
    provider: "daytona" as const,
    providerEnvironmentId: "daytona-environment-3",
    updatedAt: new Date("2026-03-27T20:00:00.000Z"),
  };
  const provisionEnvironmentForSession = vi.fn(async () => provisionedEnvironment);
  const service = new AgentEnvironmentAccessService(
    {
      async loadSession() {
        return {
          agentId: "agent-1",
          companyId: "company-1",
          id: "session-1",
        };
      },
    } as never,
    {
      acquireLease,
      async expireElapsedLeases() {
        return undefined;
      },
      async findOpenLeaseForSession() {
        return null;
      },
      async markLeaseIdle() {
        return undefined;
      },
    } as never,
    {
      createRuntime,
      getProvider() {
        return "daytona";
      },
    } as never,
    {
      provisionEnvironmentForSession,
    } as never,
    {
      async findReusableEnvironmentForAgentSession() {
        return null;
      },
    } as never,
  );

  const environment = await service.getEnvironmentForSession({} as never, "agent-1", "session-1");

  assert.equal(provisionEnvironmentForSession.mock.calls.length, 1);
  assert.equal(acquireLease.mock.calls.length, 1);
  assert.equal(createRuntime.mock.calls[0]?.[1]?.id, "environment-3");
  await environment.dispose();
});
