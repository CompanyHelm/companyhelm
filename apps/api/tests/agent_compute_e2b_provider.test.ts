import assert from "node:assert/strict";
import { Sandbox as DesktopSandbox } from "@e2b/desktop";
import { Sandbox } from "e2b";
import { test, vi } from "vitest";
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

function createConfig() {
  return {
    companyhelm: {
      e2b: {
        template_prefix: "realequityapps/",
      },
    },
  };
}

test("AgentComputeE2bProvider resolves templates from the local manager catalog", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  const templates = await provider.getTemplates({} as never, {
    companyId: "company-1",
    providerDefinitionId: "compute-provider-definition-1",
  });

  assert.deepEqual(templates, [
    {
      computerUse: true,
      cpuCount: 2,
      diskSpaceGb: 20,
      memoryGb: 4,
      name: "medium",
      templateId: "medium",
    },
    {
      computerUse: false,
      cpuCount: 1,
      diskSpaceGb: 20,
      memoryGb: 2,
      name: "small",
      templateId: "small",
    },
  ]);
  assert.equal(fetchSpy.mock.calls.length, 0);
  fetchSpy.mockRestore();
});

test("AgentComputeE2bProvider provisions E2B environments from the selected template", async () => {
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
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  const provisionedEnvironment = await provider.provisionEnvironment({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    providerDefinitionId: "compute-provider-definition-1",
    sessionId: "session-1",
    template: {
      computerUse: true,
      cpuCount: 2,
      diskSpaceGb: 20,
      memoryGb: 4,
      name: "medium",
      templateId: "medium",
    },
  });

  assert.equal(provider.getProvider(), "e2b");
  assert.equal(provider.supportsOnDemandProvisioning(), true);
  assert.equal(create.mock.calls.length, 1);
  assert.equal(create.mock.calls[0]?.[0], "realequityapps/medium");
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

test("AgentComputeE2bProvider starts desktop streaming on demand and returns the stream URL", async () => {
  const start = vi.fn(async () => undefined);
  const getUrl = vi.fn(() => "https://desktop.example/vnc");
  const connect = vi.spyOn(DesktopSandbox, "connect").mockResolvedValue({
    stream: {
      getUrl,
      start,
    },
  } as never);
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  const url = await provider.getVncUrl({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 2,
    createdAt: new Date("2026-04-07T00:00:00.000Z"),
    diskSpaceGb: 20,
    displayName: "Medium sandbox",
    id: "environment-1",
    lastSeenAt: null,
    memoryGb: 4,
    metadata: {},
    platform: "linux",
    provider: "e2b",
    providerDefinitionId: "compute-provider-definition-1",
    providerEnvironmentId: "e2b-environment-1",
    templateId: "medium",
    updatedAt: new Date("2026-04-07T00:00:00.000Z"),
  });

  assert.equal(url, "https://desktop.example/vnc");
  assert.equal(connect.mock.calls.length, 1);
  assert.deepEqual(connect.mock.calls[0], [
    "e2b-environment-1",
    {
      apiKey: "e2b-api-key",
      timeoutMs: 60 * 60 * 1000,
    },
  ]);
  assert.equal(start.mock.calls.length, 1);
  assert.equal(getUrl.mock.calls.length, 1);

  connect.mockRestore();
});
