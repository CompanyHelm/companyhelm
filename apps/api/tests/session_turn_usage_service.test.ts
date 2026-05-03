import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { llmUsageAggregates, sessionTurns } from "../src/db/schema.ts";
import { SessionTurnUsageService } from "../src/services/agent/session/session_turn_usage_service.ts";

class SessionTurnUsageServiceTestHarness {
  readonly aggregateRows: Array<Record<string, unknown>> = [];
  readonly aggregateConflictUpdates: unknown[] = [];
  readonly turnUpdates: Array<Record<string, unknown>> = [];

  createTransactionProvider() {
    return {
      transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
        return callback({
          insert: (table: unknown) => {
            assert.equal(table, llmUsageAggregates);
            return {
              values: (value: Record<string, unknown>) => {
                this.aggregateRows.push(value);
                return {
                  onConflictDoUpdate: async (conflictUpdate: unknown) => {
                    this.aggregateConflictUpdates.push(conflictUpdate);
                  },
                };
              },
            };
          },
          update: (table: unknown) => {
            assert.equal(table, sessionTurns);
            return {
              set: (value: Record<string, unknown>) => {
                this.turnUpdates.push(value);
                return {
                  where: () => ({
                    returning: async () => [{ id: "turn-1" }],
                  }),
                };
              },
            };
          },
        });
      },
    };
  }
}

test("SessionTurnUsageService stores nano USD costs and UTC aggregate buckets", async () => {
  const harness = new SessionTurnUsageServiceTestHarness();
  const service = new SessionTurnUsageService();

  await service.recordUsage(harness.createTransactionProvider() as never, {
    agentId: "00000000-0000-0000-0000-000000000002",
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000005",
    recordedAt: new Date("2026-04-20T23:30:00.000Z"),
    sessionId: "00000000-0000-0000-0000-000000000003",
    turnId: "00000000-0000-0000-0000-000000000004",
    usage: {
      cacheRead: 30,
      cacheWrite: 40,
      cost: {
        cacheRead: 0.000000003,
        cacheWrite: 0.000000004,
        input: 0.000000001,
        output: 0.000000002,
        total: 0.000000010,
      },
      input: 100,
      output: 50,
      totalTokens: 220,
    },
  });

  assert.equal(harness.turnUpdates.length, 1);
  assert.equal(harness.aggregateRows.length, 10);
  assert.equal(harness.aggregateConflictUpdates.length, 10);

  const sessionTotal = harness.aggregateRows.find((row) => {
    return row.scopeType === "session" && row.period === "total";
  });
  const agentDay = harness.aggregateRows.find((row) => {
    return row.scopeType === "agent" && row.period === "day";
  });
  const companyMonth = harness.aggregateRows.find((row) => {
    return row.scopeType === "company" && row.period === "month";
  });
  const providerDay = harness.aggregateRows.find((row) => {
    return row.scopeType === "model_provider_credential" && row.period === "day";
  });

  assert.ok(sessionTotal);
  assert.equal(sessionTotal.requestCount, 1);
  assert.equal(sessionTotal.inputTokens, 100);
  assert.equal(sessionTotal.outputTokens, 50);
  assert.equal(sessionTotal.cacheReadTokens, 30);
  assert.equal(sessionTotal.cacheWriteTokens, 40);
  assert.equal(sessionTotal.totalTokens, 220);
  assert.equal(sessionTotal.inputCostNanoUsd, 1);
  assert.equal(sessionTotal.outputCostNanoUsd, 2);
  assert.equal(sessionTotal.cacheReadCostNanoUsd, 3);
  assert.equal(sessionTotal.cacheWriteCostNanoUsd, 4);
  assert.equal(sessionTotal.totalCostNanoUsd, 10);
  assert.equal((sessionTotal.periodStart as Date).toISOString(), "1970-01-01T00:00:00.000Z");

  assert.ok(agentDay);
  assert.equal((agentDay.periodStart as Date).toISOString(), "2026-04-20T00:00:00.000Z");
  assert.ok(providerDay);
  assert.equal(providerDay.modelProviderCredentialId, "00000000-0000-0000-0000-000000000005");
  assert.equal((providerDay.periodStart as Date).toISOString(), "2026-04-20T00:00:00.000Z");
  assert.ok(companyMonth);
  assert.equal((companyMonth.periodStart as Date).toISOString(), "2026-04-01T00:00:00.000Z");
});

test("SessionTurnUsageService stores provider costs under the credential scope", async () => {
  const harness = new SessionTurnUsageServiceTestHarness();
  const service = new SessionTurnUsageService();

  await service.recordUsage(harness.createTransactionProvider() as never, {
    agentId: "00000000-0000-0000-0000-000000000002",
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000005",
    recordedAt: new Date("2026-04-20T23:30:00.000Z"),
    sessionId: "00000000-0000-0000-0000-000000000003",
    turnId: "00000000-0000-0000-0000-000000000004",
    usage: {
      cost: {
        input: 0.000000001,
        total: 0.000000001,
      },
      input: 100,
      totalTokens: 100,
    },
  });

  const providerTotal = harness.aggregateRows.find((row) => {
    return row.scopeType === "model_provider_credential" && row.period === "total";
  });

  assert.ok(providerTotal);
  assert.equal(providerTotal.modelProviderCredentialId, "00000000-0000-0000-0000-000000000005");
  assert.equal(providerTotal.totalCostNanoUsd, 1);
});

test("SessionTurnUsageService skips empty usage payloads", async () => {
  const harness = new SessionTurnUsageServiceTestHarness();
  const service = new SessionTurnUsageService();

  await service.recordUsage(harness.createTransactionProvider() as never, {
    agentId: "00000000-0000-0000-0000-000000000002",
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000005",
    recordedAt: new Date("2026-04-20T23:30:00.000Z"),
    sessionId: "00000000-0000-0000-0000-000000000003",
    turnId: "00000000-0000-0000-0000-000000000004",
    usage: {},
  });

  assert.equal(harness.turnUpdates.length, 0);
  assert.equal(harness.aggregateRows.length, 0);
});

test("SessionTurnUsageService enqueues usage when an async queue is configured", async () => {
  const enqueueUsage = vi.fn(async () => undefined);
  const processor = {
    processUsage: vi.fn(async () => undefined),
  };
  const service = new SessionTurnUsageService(
    processor as never,
    { enqueueUsage } as never,
  );

  await service.recordUsage({} as never, {
    agentId: "00000000-0000-0000-0000-000000000002",
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000005",
    recordedAt: new Date("2026-04-20T23:30:00.000Z"),
    sessionId: "00000000-0000-0000-0000-000000000003",
    turnId: "00000000-0000-0000-0000-000000000004",
    usage: {
      totalTokens: 1,
    },
  });

  assert.equal(enqueueUsage.mock.calls.length, 1);
  assert.equal(processor.processUsage.mock.calls.length, 0);
});

test("SessionTurnUsageService logs and swallows queue failures", async () => {
  const error = vi.fn();
  const service = new SessionTurnUsageService(
    { processUsage: vi.fn(async () => undefined) } as never,
    {
      enqueueUsage: vi.fn(async () => {
        throw new Error("redis down");
      }),
    } as never,
    { error } as never,
  );

  await service.recordUsage({} as never, {
    agentId: "00000000-0000-0000-0000-000000000002",
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000005",
    recordedAt: new Date("2026-04-20T23:30:00.000Z"),
    sessionId: "00000000-0000-0000-0000-000000000003",
    turnId: "00000000-0000-0000-0000-000000000004",
    usage: {
      totalTokens: 1,
    },
  });

  assert.equal(error.mock.calls.length, 1);
});

test("SessionTurnUsageService accepts queue-deserialized recordedAt strings", async () => {
  const harness = new SessionTurnUsageServiceTestHarness();
  const service = new SessionTurnUsageService();

  await service.recordUsage(harness.createTransactionProvider() as never, {
    agentId: "00000000-0000-0000-0000-000000000002",
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000005",
    recordedAt: "2026-04-20T23:30:00.000Z" as never,
    sessionId: "00000000-0000-0000-0000-000000000003",
    turnId: "00000000-0000-0000-0000-000000000004",
    usage: {
      totalTokens: 3,
    },
  });

  assert.equal(harness.turnUpdates.length, 1);
  assert.equal(harness.aggregateRows.length, 10);
});
