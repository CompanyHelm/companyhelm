import assert from "node:assert/strict";
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
        templates: [{
          computer_use: true,
          name: "Desktop",
          template_id: "e2b/desktop",
        }],
      },
    },
  };
}

test("AgentComputeE2bProvider resolves configured templates from the E2B API", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/templates/e2b%2Fdesktop")) {
      return {
        ok: false,
        status: 404,
      } as never;
    }
    if (url.endsWith("/templates/aliases/e2b%2Fdesktop")) {
      return {
        ok: false,
        status: 404,
      } as never;
    }

    assert.equal(url, "https://api.e2b.app/templates/desktop");
    return {
      json: async () => ({
        aliases: ["desktop"],
        builds: [{
          cpuCount: 4,
          createdAt: "2026-04-07T00:00:00.000Z",
          diskSizeMB: 20 * 1024,
          memoryMB: 8 * 1024,
          status: "ready",
          updatedAt: "2026-04-07T00:00:00.000Z",
        }],
        names: ["desktop"],
        templateID: "desktop",
      }),
      ok: true,
      status: 200,
    } as never;
  });
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    {} as never,
    createComputeProviderDefinitionService() as never,
  );

  const templates = await provider.getTemplates({} as never, {
    companyId: "company-1",
    providerDefinitionId: "compute-provider-definition-1",
  });

  assert.deepEqual(templates, [{
    computerUse: true,
    cpuCount: 4,
    diskSpaceGb: 20,
    memoryGb: 8,
    name: "Desktop",
    templateId: "e2b/desktop",
  }]);
  assert.deepEqual(fetchSpy.mock.calls.map((call) => call[0]), [
    "https://api.e2b.app/templates/e2b%2Fdesktop",
    "https://api.e2b.app/templates/desktop",
  ]);
  fetchSpy.mockRestore();
});

test("AgentComputeE2bProvider provisions E2B environments from the selected template", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/templates/e2b%2Fdesktop")) {
      return {
        ok: false,
        status: 404,
      } as never;
    }
    if (url.endsWith("/templates/aliases/e2b%2Fdesktop")) {
      return {
        ok: false,
        status: 404,
      } as never;
    }

    assert.equal(url, "https://api.e2b.app/templates/desktop");
    return {
      json: async () => ({
        aliases: ["desktop"],
        builds: [{
          cpuCount: 4,
          createdAt: "2026-04-07T00:00:00.000Z",
          diskSizeMB: 20 * 1024,
          memoryMB: 8 * 1024,
          status: "ready",
          updatedAt: "2026-04-07T00:00:00.000Z",
        }],
        names: ["desktop"],
        templateID: "desktop",
      }),
      ok: true,
      status: 200,
    } as never;
  });
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
    {} as never,
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
      name: "Desktop",
      templateId: "e2b/desktop",
    },
  });

  assert.equal(provider.getProvider(), "e2b");
  assert.equal(provider.supportsOnDemandProvisioning(), true);
  assert.equal(create.mock.calls.length, 1);
  assert.equal(create.mock.calls[0]?.[0], "desktop");
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
  fetchSpy.mockRestore();
  create.mockRestore();
});
