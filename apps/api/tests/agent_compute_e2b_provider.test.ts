import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { Sandbox } from "e2b";
import { AgentComputeE2bProvider } from "../src/services/agent/compute/e2b/e2b_provider.ts";

function createComputeProviderDefinitionService() {
  return {
    async loadRuntimeDefinitionById() {
      return {
        apiKey: "e2b-api-key",
        companyId: "company-1",
        description: null,
        id: "compute-provider-definition-1",
        name: "Primary E2B",
        provider: "e2b" as const,
      };
    },
  };
}

test("AgentComputeE2bProvider provisions E2B environments from the Codex template", async () => {
  const getInfo = vi.fn(async () => ({
    cpuCount: 8,
    memoryMB: 12 * 1024,
  }));
  const kill = vi.fn(async () => undefined);
  const create = vi.spyOn(Sandbox, "create").mockResolvedValue({
    getInfo,
    kill,
    sandboxId: "e2b-environment-1",
  } as never);
  const provider = new AgentComputeE2bProvider(
    {} as never,
    createComputeProviderDefinitionService() as never,
  );

  const provisionedEnvironment = await provider.provisionEnvironment({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    providerDefinitionId: "compute-provider-definition-1",
    requirements: {
      minCpuCount: 2,
      minDiskSpaceGb: 20,
      minMemoryGb: 4,
    },
    sessionId: "session-1",
  });

  assert.equal(provider.getProvider(), "e2b");
  assert.equal(provider.supportsOnDemandProvisioning(), true);
  assert.equal(create.mock.calls.length, 1);
  assert.equal(create.mock.calls[0]?.[0], "wunszvjeuyrdgrt0z6o9");
  assert.deepEqual(create.mock.calls[0]?.[1], {
    apiKey: "e2b-api-key",
    lifecycle: {
      autoResume: true,
      onTimeout: "pause",
    },
    metadata: {
      agentId: "agent-1",
      companyId: "company-1",
      sessionId: "session-1",
    },
    timeoutMs: 60 * 60 * 1000,
  });
  assert.equal(getInfo.mock.calls.length, 1);
  assert.equal(provisionedEnvironment.providerEnvironmentId, "e2b-environment-1");
  assert.equal(provisionedEnvironment.platform, "linux");
  assert.deepEqual(provisionedEnvironment.metadata, {});
  assert.equal(provisionedEnvironment.cpuCount, 8);
  assert.equal(provisionedEnvironment.diskSpaceGb, 20);
  assert.equal(provisionedEnvironment.memoryGb, 12);
  create.mockRestore();
});
