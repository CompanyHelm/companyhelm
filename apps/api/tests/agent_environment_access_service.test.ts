import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentAccessService } from "../src/services/environments/access_service.ts";

class FakeEnvironmentShell {
  async executeCommand(command: string) {
    if (command.includes("tmux -V")) {
      return {
        exitCode: 0,
        stdout: "",
      };
    }
    if (command.includes("tmux list-sessions")) {
      return {
        exitCode: 0,
        stdout: "",
      };
    }

    throw new Error(`unexpected shell command: ${command}`);
  }
}

test("AgentEnvironmentAccessService reactivates the current session lease before consulting history or provisioning", async () => {
  const activateLease = vi.fn(async () => ({
    id: "lease-1",
  }));
  const createShell = vi.fn(async () => new FakeEnvironmentShell());
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
      async releaseLease() {
        throw new Error("releaseLease should not run for a healthy leased environment");
      },
    } as never,
    {
      createShell,
      async getEnvironmentStatus() {
        return "running";
      },
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
  assert.equal(createShell.mock.calls.length, 1);
  assert.deepEqual(await environment.listPtys(), []);
});

test("AgentEnvironmentAccessService prefers historical reuse before provisioning a new environment", async () => {
  const acquireLease = vi.fn(async () => ({
    id: "lease-2",
  }));
  const createShell = vi.fn(async () => new FakeEnvironmentShell());
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
      async releaseLease() {
        return undefined;
      },
    } as never,
    {
      createShell,
      async getEnvironmentStatus() {
        return "running";
      },
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
  assert.equal(createShell.mock.calls.length, 1);
  assert.equal(createShell.mock.calls[0]?.[1]?.id, "environment-2");
  await environment.dispose();
});

test("AgentEnvironmentAccessService provisions a new environment instead of reusing an unhealthy session lease", async () => {
  const provisionedEnvironment = {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 2,
    createdAt: new Date("2026-03-27T20:00:00.000Z"),
    diskSpaceGb: 20,
    displayName: null,
    id: "environment-4",
    lastSeenAt: null,
    memoryGb: 4,
    metadata: {},
    platform: "linux" as const,
    provider: "daytona" as const,
    providerEnvironmentId: "daytona-environment-4",
    updatedAt: new Date("2026-03-27T20:00:00.000Z"),
  };
  const activateLease = vi.fn(async () => ({
    id: "lease-1",
  }));
  const releaseLease = vi.fn(async () => undefined);
  const acquireLease = vi.fn(async () => ({
    id: "lease-4",
  }));
  const createShell = vi.fn(async () => new FakeEnvironmentShell());
  const provisionEnvironmentForSession = vi.fn(async () => provisionedEnvironment);
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
      acquireLease,
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
      async markLeaseIdle() {
        return undefined;
      },
      releaseLease,
    } as never,
    {
      createShell,
      async getEnvironmentStatus() {
        return "unhealthy";
      },
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

  assert.equal(activateLease.mock.calls.length, 0);
  assert.equal(releaseLease.mock.calls.length, 1);
  assert.equal(provisionEnvironmentForSession.mock.calls.length, 1);
  assert.equal(createShell.mock.calls[0]?.[1]?.id, "environment-4");
  await environment.dispose();
});

test("AgentEnvironmentAccessService provisions a new environment when no reusable history exists", async () => {
  const acquireLease = vi.fn(async () => ({
    id: "lease-3",
  }));
  const createShell = vi.fn(async () => new FakeEnvironmentShell());
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
      async releaseLease() {
        return undefined;
      },
    } as never,
    {
      createShell,
      async getEnvironmentStatus() {
        return "running";
      },
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
  assert.equal(createShell.mock.calls[0]?.[1]?.id, "environment-3");
  await environment.dispose();
});

test("AgentEnvironmentAccessService logs and wraps provider shell connection failures", async () => {
  const connectError = new DOMException("The operation was aborted due to timeout", "TimeoutError");
  const warn = vi.fn();
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
      async acquireLease() {
        return {
          id: "lease-3",
        };
      },
      async expireElapsedLeases() {
        return undefined;
      },
      async findOpenLeaseForSession() {
        return null;
      },
      async markLeaseIdle() {
        return undefined;
      },
      async releaseLease() {
        return undefined;
      },
    } as never,
    {
      async createShell() {
        throw connectError;
      },
      async getEnvironmentStatus() {
        return "running";
      },
      getProvider() {
        return "e2b";
      },
    } as never,
    {
      async provisionEnvironmentForSession() {
        return {
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
          provider: "e2b" as const,
          providerEnvironmentId: "sandbox-123",
          updatedAt: new Date("2026-03-27T20:00:00.000Z"),
        };
      },
    } as never,
    {
      async findReusableEnvironmentForAgentSession() {
        return null;
      },
    } as never,
    undefined,
    {
      child() {
        return {
          warn,
        } as never;
      },
    } as never,
  );

  await assert.rejects(async () => {
    await service.getEnvironmentForSession({} as never, "agent-1", "session-1");
  }, (error) => {
    assert.equal(
      error instanceof Error ? error.message : "",
      "Failed to connect to e2b environment sandbox-123 for session session-1.",
    );
    assert.equal(error instanceof Error ? error.cause : null, connectError);
    return true;
  });

  assert.deepEqual(warn.mock.calls, [[{
    agentId: "agent-1",
    companyId: "company-1",
    environmentId: "environment-3",
    err: connectError,
    provider: "e2b",
    providerEnvironmentId: "sandbox-123",
    reusedLease: false,
    sessionId: "session-1",
  }, "failed to connect to provider environment shell"]]);
});
