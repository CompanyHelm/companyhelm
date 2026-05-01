import assert from "node:assert/strict";
import { test } from "vitest";
import { EnvironmentMetricsCollectionService } from "../src/services/environments/metrics/collection_service.ts";
import type { EnvironmentMetricsAdapterInterface } from "../src/services/environments/metrics/adapter_interface.ts";

class EnvironmentMetricsCollectionTestHarness {
  static createEnvironment(overrides: Record<string, unknown> = {}) {
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
      ...overrides,
    };
  }
}

test("EnvironmentMetricsCollectionService stores a minute-bucket trend sample and latest environment snapshot", async () => {
  const deletedConditions: unknown[] = [];
  const insertedValues: Record<string, unknown>[] = [];
  const scopedCompanyIds: string[] = [];
  const updatedValues: Record<string, unknown>[] = [];
  const adminDatabase = {
    getDatabase() {
      return {
        select() {
          return {
            async from() {
              return [EnvironmentMetricsCollectionTestHarness.createEnvironment()];
            },
          };
        },
      } as never;
    },
  };
  const appRuntimeDatabase = {
    async withCompanyContext(companyId: string, callback: (database: unknown) => Promise<unknown>) {
      scopedCompanyIds.push(companyId);
      return callback({
        delete() {
          return {
            async where(condition: unknown) {
              deletedConditions.push(condition);
            },
          };
        },
        insert() {
          return {
            values(value: Record<string, unknown>) {
              insertedValues.push(value);
              return {
                async onConflictDoUpdate() {
                  return undefined;
                },
              };
            },
          };
        },
        update() {
          return {
            set(value: Record<string, unknown>) {
              updatedValues.push(value);
              return {
                async where() {
                  return undefined;
                },
              };
            },
          };
        },
      });
    },
  };
  const adapter: EnvironmentMetricsAdapterInterface = {
    getProvider() {
      return "e2b";
    },
    async getLatestMetrics(_transactionProvider, environment) {
      assert.equal(environment.id, "environment-1");
      return {
        cpuUsedPct: 12.5,
        diskUsedBytes: 3_000,
        memUsedBytes: 2_000,
        sampledAt: new Date("2026-04-02T03:04:05.000Z"),
      };
    },
  };
  const service = new EnvironmentMetricsCollectionService(
    adminDatabase as never,
    appRuntimeDatabase as never,
    {
      get(provider) {
        assert.equal(provider, "e2b");
        return adapter;
      },
    } as never,
  );

  const result = await service.collectAllEnvironments();

  assert.deepEqual(result, {
    checkedEnvironments: 1,
    failedEnvironments: 0,
    skippedEnvironments: 0,
    updatedEnvironments: 1,
  });
  assert.deepEqual(scopedCompanyIds, ["company-1", "company-1"]);
  assert.deepEqual(insertedValues, [{
    companyId: "company-1",
    cpuUsedPct: 12.5,
    createdAt: insertedValues[0]?.createdAt,
    diskUsedBytes: 3_000,
    environmentId: "environment-1",
    memUsedBytes: 2_000,
    sampledAt: new Date("2026-04-02T03:04:00.000Z"),
  }]);
  assert.ok(insertedValues[0]?.createdAt instanceof Date);
  assert.deepEqual(updatedValues, [{
    cpuUsedPct: 12.5,
    diskUsedBytes: 3_000,
    memUsedBytes: 2_000,
    metricsSampledAt: new Date("2026-04-02T03:04:05.000Z"),
  }]);
  assert.equal(deletedConditions.length, 1);
});

test("EnvironmentMetricsCollectionService skips environments until a provider reports a sample", async () => {
  let updateCalled = false;
  const adminDatabase = {
    getDatabase() {
      return {
        select() {
          return {
            async from() {
              return [EnvironmentMetricsCollectionTestHarness.createEnvironment()];
            },
          };
        },
      } as never;
    },
  };
  const appRuntimeDatabase = {
    async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
      return callback({
        delete() {
          return {
            async where() {
              return undefined;
            },
          };
        },
        update() {
          updateCalled = true;
          throw new Error("update should not run without metrics");
        },
      });
    },
  };
  const service = new EnvironmentMetricsCollectionService(
    adminDatabase as never,
    appRuntimeDatabase as never,
    {
      get() {
        return {
          getProvider() {
            return "e2b";
          },
          async getLatestMetrics() {
            return null;
          },
        };
      },
    } as never,
  );

  const result = await service.collectAllEnvironments();

  assert.deepEqual(result, {
    checkedEnvironments: 1,
    failedEnvironments: 0,
    skippedEnvironments: 1,
    updatedEnvironments: 0,
  });
  assert.equal(updateCalled, false);
});
