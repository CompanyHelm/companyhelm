import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentProvisioning } from "../src/services/agent/environment/provisioning.ts";
import { AgentEnvironmentProvisioningService } from "../src/services/agent/environment/provisioning_service.ts";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";

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
  providerDefinitionId: "compute-provider-definition-1",
  providerEnvironmentId: "daytona-environment-1",
  updatedAt: new Date("2026-03-29T20:00:00.000Z"),
};

class AgentEnvironmentProvisioningServiceTestTransactions {
  private readonly defaultComputeProviderDefinitionId: string | null;

  constructor(defaultComputeProviderDefinitionId: string | null) {
    this.defaultComputeProviderDefinitionId = defaultComputeProviderDefinitionId;
  }

  build(): TransactionProviderInterface {
    const defaultComputeProviderDefinitionId = this.defaultComputeProviderDefinitionId;
    return {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select: () => ({
            from: () => ({
              where: async () => [{
                defaultComputeProviderDefinitionId,
              }],
            }),
          }),
        });
      },
    } as never;
  }
}

test("AgentEnvironmentProvisioning provisions the workspace directory through the provider shell", async () => {
  const executeCommand = vi.fn(async () => ({
    exitCode: 0,
    stdout: "",
  }));
  const createShell = vi.fn(async () => ({
    executeCommand,
  }));
  const provisioning = new AgentEnvironmentProvisioning({
    get() {
      return {
        async createShell(_transactionProvider, environment) {
          return createShell(_transactionProvider, environment);
        },
      };
    },
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
  const transactions = new AgentEnvironmentProvisioningServiceTestTransactions(
    "compute-provider-definition-1",
  );
  const transactionProvider = transactions.build();
  const service = new AgentEnvironmentProvisioningService(
    {
      createEnvironment,
    } as never,
    {
      async loadDefinitionById() {
        return {
          id: "compute-provider-definition-1",
          name: "Primary Daytona",
          provider: "daytona" as const,
        };
      },
    } as never,
    {
      get(provider) {
        assert.equal(provider, "daytona");
        return {
          getProvider() {
            return "daytona" as const;
          },
          provisionEnvironment: providerProvisionEnvironment,
          supportsOnDemandProvisioning() {
            return true;
          },
        };
      },
    } as never,
    {
      provision: bootstrapProvision,
    } as never,
    {
      async getRequirements() {
        return {
          minCpuCount: 6,
          minDiskSpaceGb: 40,
          minMemoryGb: 12,
        };
      },
    } as never,
  );

  const environment = await service.provisionEnvironmentForSession(transactionProvider, {
    agentId: "agent-1",
    companyId: "company-1",
    sessionId: "session-1",
  });

  assert.equal(environment, createdEnvironment);
  assert.equal(providerProvisionEnvironment.mock.calls.length, 1);
  assert.deepEqual(providerProvisionEnvironment.mock.calls[0]?.[1], {
    agentId: "agent-1",
    companyId: "company-1",
    requirements: {
      minCpuCount: 6,
      minDiskSpaceGb: 40,
      minMemoryGb: 12,
    },
    providerDefinitionId: "compute-provider-definition-1",
    sessionId: "session-1",
  });
  assert.equal(createEnvironment.mock.calls.length, 1);
  assert.deepEqual(bootstrapProvision.mock.calls, [[transactionProvider, createdEnvironment]]);
});

test("AgentEnvironmentProvisioningService deletes the catalog row and remote environment when bootstrap fails", async () => {
  const cleanup = vi.fn(async () => undefined);
  const deleteEnvironment = vi.fn(async () => createdEnvironment);
  const transactions = new AgentEnvironmentProvisioningServiceTestTransactions(
    "compute-provider-definition-1",
  );
  const transactionProvider = transactions.build();
  const service = new AgentEnvironmentProvisioningService(
    {
      async createEnvironment() {
        return createdEnvironment;
      },
      deleteEnvironment,
    } as never,
    {
      async loadDefinitionById() {
        return {
          id: "compute-provider-definition-1",
          name: "Primary Daytona",
          provider: "daytona" as const,
        };
      },
    } as never,
    {
      get(provider) {
        assert.equal(provider, "daytona");
        return {
          getProvider() {
            return "daytona" as const;
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
        };
      },
    } as never,
    {
      async provision() {
        throw new Error("workspace bootstrap failed");
      },
    } as never,
    {
      async getRequirements() {
        return {
          minCpuCount: 2,
          minDiskSpaceGb: 20,
          minMemoryGb: 4,
        };
      },
    } as never,
  );

  await assert.rejects(
    service.provisionEnvironmentForSession(transactionProvider, {
      agentId: "agent-1",
      companyId: "company-1",
      sessionId: "session-1",
    }),
    /workspace bootstrap failed/,
  );

  assert.deepEqual(
    deleteEnvironment.mock.calls,
    [[transactionProvider, createdEnvironment.id, "company-1"]],
  );
  assert.equal(cleanup.mock.calls.length, 1);
});
