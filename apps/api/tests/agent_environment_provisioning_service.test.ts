import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentProvisioning } from "../src/services/environments/provisioning.ts";
import { AgentEnvironmentProvisioningService } from "../src/services/environments/provisioning_service.ts";
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
  provider: "e2b" as const,
  providerDefinitionId: "compute-provider-definition-1",
  providerEnvironmentId: "e2b-environment-1",
  templateId: "e2b/desktop",
  updatedAt: new Date("2026-03-29T20:00:00.000Z"),
};

class AgentEnvironmentProvisioningServiceTestTransactions {
  private readonly defaultComputeProviderDefinitionId: string | null;
  private readonly defaultEnvironmentTemplateId: string;

  constructor(defaultComputeProviderDefinitionId: string | null, defaultEnvironmentTemplateId = "e2b/desktop") {
    this.defaultComputeProviderDefinitionId = defaultComputeProviderDefinitionId;
    this.defaultEnvironmentTemplateId = defaultEnvironmentTemplateId;
  }

  build(): TransactionProviderInterface {
    const defaultComputeProviderDefinitionId = this.defaultComputeProviderDefinitionId;
    const defaultEnvironmentTemplateId = this.defaultEnvironmentTemplateId;
    return {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select: () => ({
            from: () => ({
              where: async () => [{
                defaultComputeProviderDefinitionId,
                defaultEnvironmentTemplateId,
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
  assert.deepEqual(executeCommand.mock.calls, [[`sh -lc 'mkdir -p ~/workspace'`]]);
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
    providerEnvironmentId: "e2b-environment-1",
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
          name: "Primary E2B",
          provider: "e2b" as const,
        };
      },
    } as never,
    {
      get(provider) {
        assert.equal(provider, "e2b");
        return {
          getProvider() {
            return "e2b" as const;
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
      async resolveTemplateForProvider() {
        return {
          computerUse: false,
          cpuCount: 6,
          diskSpaceGb: 40,
          memoryGb: 12,
          name: "Desktop",
          templateId: "e2b/desktop",
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
    template: {
      computerUse: false,
      cpuCount: 6,
      diskSpaceGb: 40,
      memoryGb: 12,
      name: "Desktop",
      templateId: "e2b/desktop",
    },
    providerDefinitionId: "compute-provider-definition-1",
    sessionId: "session-1",
  });
  assert.equal(createEnvironment.mock.calls.length, 1);
  assert.equal(createEnvironment.mock.calls[0]?.[1]?.templateId, "e2b/desktop");
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
          name: "Primary E2B",
          provider: "e2b" as const,
        };
      },
    } as never,
    {
      get(provider) {
        assert.equal(provider, "e2b");
        return {
          getProvider() {
            return "e2b" as const;
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
              providerEnvironmentId: "e2b-environment-1",
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
      async resolveTemplateForProvider() {
        return {
          computerUse: false,
          cpuCount: 2,
          diskSpaceGb: 20,
          memoryGb: 4,
          name: "Desktop",
          templateId: "e2b/desktop",
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
