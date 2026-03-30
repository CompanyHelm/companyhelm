import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentProvisioning } from "../src/services/agent/environment/provisioning.ts";
import { AgentEnvironmentProvisioningService } from "../src/services/agent/environment/provisioning_service.ts";

const createdEnvironment = {
  agentId: "agent-1",
  companyId: "company-1",
  cpuCount: 2,
  createdAt: new Date("2026-03-29T20:00:00.000Z"),
  diskSpaceGb: 20,
  displayName: null,
  id: "environment-1",
  lastSeenAt: null,
  memoryGb: 4,
  metadata: {},
  platform: "linux" as const,
  provider: "daytona" as const,
  providerEnvironmentId: "daytona-environment-1",
  updatedAt: new Date("2026-03-29T20:00:00.000Z"),
};

test("AgentEnvironmentProvisioning provisions the workspace directory through the provider shell", async () => {
  const executeCommand = vi.fn(async () => ({
    exitCode: 0,
    stdout: "",
  }));
  const createShell = vi.fn(async () => ({
    executeCommand,
  }));
  const provisioning = new AgentEnvironmentProvisioning({
    createShell,
  } as never);

  await provisioning.provision({} as never, createdEnvironment);

  assert.equal(createShell.mock.calls.length, 1);
  assert.deepEqual(createShell.mock.calls[0]?.[1], createdEnvironment);
  assert.deepEqual(executeCommand.mock.calls, [["mkdir -p /workspace"]]);
});

test("AgentEnvironmentProvisioningService bootstraps the created environment before returning it", async () => {
  const providerProvisionEnvironment = vi.fn(async () => ({
    cleanup: vi.fn(async () => undefined),
    cpuCount: 2,
    diskSpaceGb: 20,
    displayName: null,
    memoryGb: 4,
    metadata: {},
    platform: "linux" as const,
    providerEnvironmentId: "daytona-environment-1",
  }));
  const createEnvironment = vi.fn(async () => createdEnvironment);
  const bootstrapProvision = vi.fn(async () => undefined);
  const service = new AgentEnvironmentProvisioningService(
    {
      createEnvironment,
    } as never,
    {
      getProvider() {
        return "daytona";
      },
      provisionEnvironment: providerProvisionEnvironment,
      supportsOnDemandProvisioning() {
        return true;
      },
    } as never,
    {
      provision: bootstrapProvision,
    } as never,
  );

  const environment = await service.provisionEnvironmentForSession({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    sessionId: "session-1",
  });

  assert.equal(environment, createdEnvironment);
  assert.equal(providerProvisionEnvironment.mock.calls.length, 1);
  assert.equal(createEnvironment.mock.calls.length, 1);
  assert.deepEqual(bootstrapProvision.mock.calls, [[{}, createdEnvironment]]);
});

test("AgentEnvironmentProvisioningService deletes the catalog row and remote environment when bootstrap fails", async () => {
  const cleanup = vi.fn(async () => undefined);
  const deleteEnvironment = vi.fn(async () => createdEnvironment);
  const service = new AgentEnvironmentProvisioningService(
    {
      async createEnvironment() {
        return createdEnvironment;
      },
      deleteEnvironment,
    } as never,
    {
      getProvider() {
        return "daytona";
      },
      async provisionEnvironment() {
        return {
          cleanup,
          cpuCount: 2,
          diskSpaceGb: 20,
          displayName: null,
          memoryGb: 4,
          metadata: {},
          platform: "linux" as const,
          providerEnvironmentId: "daytona-environment-1",
        };
      },
      supportsOnDemandProvisioning() {
        return true;
      },
    } as never,
    {
      async provision() {
        throw new Error("workspace bootstrap failed");
      },
    } as never,
  );

  await assert.rejects(
    service.provisionEnvironmentForSession({} as never, {
      agentId: "agent-1",
      companyId: "company-1",
      sessionId: "session-1",
    }),
    /workspace bootstrap failed/,
  );

  assert.deepEqual(
    deleteEnvironment.mock.calls,
    [[{}, createdEnvironment.id, "company-1"]],
  );
  assert.equal(cleanup.mock.calls.length, 1);
});
