import assert from "node:assert/strict";
import { Sandbox } from "e2b";
import { afterEach, test, vi } from "vitest";
import { E2bEnvironmentMetricsAdapter } from "../src/services/environments/providers/e2b/metrics_adapter.ts";

function createEnvironmentRecord() {
  return {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 2,
    cpuUsedPct: null,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    diskSpaceGb: 20,
    diskUsedBytes: null,
    displayName: "Sandbox",
    id: "environment-1",
    lastSeenAt: null,
    memoryGb: 4,
    memUsedBytes: null,
    metadata: {},
    metricsSampledAt: null,
    platform: "linux" as const,
    provider: "e2b" as const,
    providerDefinitionId: "definition-1",
    providerEnvironmentId: "sandbox-1",
    templateId: "medium",
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("E2bEnvironmentMetricsAdapter maps the newest E2B sandbox metric sample", async () => {
  const getMetrics = vi.spyOn(Sandbox, "getMetrics").mockResolvedValue([
    {
      cpuCount: 2,
      cpuUsedPct: 1.25,
      diskTotal: 10_000,
      diskUsed: 1_000,
      memTotal: 4_000,
      memUsed: 2_000,
      timestamp: new Date("2026-04-02T03:04:00.000Z"),
      timestampUnix: 1775099040,
    },
    {
      cpuCount: 2,
      cpuUsedPct: 3.5,
      diskTotal: 10_000,
      diskUsed: 1_500,
      memTotal: 4_000,
      memUsed: 2_500,
      timestamp: new Date("2026-04-02T03:04:05.000Z"),
      timestampUnix: 1775099045,
    },
  ] as never);
  const adapter = new E2bEnvironmentMetricsAdapter({
    async loadRuntimeDefinitionById() {
      return {
        apiKey: "e2b-api-key",
        companyId: "company-1",
        description: null,
        id: "definition-1",
        name: "Primary E2B",
        provider: "e2b" as const,
      };
    },
  } as never);

  const sample = await adapter.getLatestMetrics({} as never, createEnvironmentRecord());

  assert.deepEqual(getMetrics.mock.calls, [["sandbox-1", { apiKey: "e2b-api-key" }]]);
  assert.deepEqual(sample, {
    cpuUsedPct: 3.5,
    diskUsedBytes: 1_500,
    memUsedBytes: 2_500,
    sampledAt: new Date("2026-04-02T03:04:05.000Z"),
  });
});

test("E2bEnvironmentMetricsAdapter returns null until E2B has collected metrics", async () => {
  vi.spyOn(Sandbox, "getMetrics").mockResolvedValue([] as never);
  const adapter = new E2bEnvironmentMetricsAdapter({
    async loadRuntimeDefinitionById() {
      return {
        apiKey: "e2b-api-key",
        companyId: "company-1",
        description: null,
        id: "definition-1",
        name: "Primary E2B",
        provider: "e2b" as const,
      };
    },
  } as never);

  assert.equal(await adapter.getLatestMetrics({} as never, createEnvironmentRecord()), null);
});
