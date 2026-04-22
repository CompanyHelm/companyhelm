import assert from "node:assert/strict";
import { test } from "vitest";
import { LlmUsageAggregatesQueryResolver } from "../src/graphql/resolvers/llm_usage_aggregates.ts";

class LlmUsageAggregatesQueryTestHarness {
  static createContext(rows: Array<Record<string, unknown>>) {
    return {
      authSession: {
        company: {
          id: "company-1",
          name: "Example Org",
        },
        token: "token",
        user: {
          id: "user-1",
        },
      },
      app_runtime_transaction_provider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>) {
          return callback({
            select() {
              return {
                from() {
                  return {
                    async where() {
                      return rows;
                    },
                  };
                },
              };
            },
          });
        },
      },
    } as never;
  }

  static createAggregate(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      cacheReadCostNanoUsd: 500,
      cacheReadTokens: 2,
      cacheWriteCostNanoUsd: 700,
      cacheWriteTokens: 3,
      companyId: "company-1",
      createdAt: new Date("2026-04-20T12:00:00.000Z"),
      id: "aggregate-1",
      inputCostNanoUsd: 1_000,
      inputTokens: 10,
      outputCostNanoUsd: 2_000,
      outputTokens: 20,
      period: "total",
      periodStart: new Date(0),
      requestCount: 1,
      scopeId: "company-1",
      scopeType: "company",
      totalCostNanoUsd: 4_200,
      totalTokens: 35,
      updatedAt: new Date("2026-04-20T12:05:00.000Z"),
      ...overrides,
    };
  }
}

test("LlmUsageAggregatesQueryResolver serializes aggregate rows for the authenticated company", async () => {
  const resolver = new LlmUsageAggregatesQueryResolver();
  const rows = [
    LlmUsageAggregatesQueryTestHarness.createAggregate({
      id: "month-1",
      period: "month",
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
    }),
    LlmUsageAggregatesQueryTestHarness.createAggregate({
      id: "day-1",
      period: "day",
      periodStart: new Date("2026-04-20T00:00:00.000Z"),
    }),
  ];

  const result = await resolver.execute(
    null,
    {
      input: {
        periodStartAfter: "2026-04-01T00:00:00.000Z",
        scopeType: "company",
      },
    },
    LlmUsageAggregatesQueryTestHarness.createContext(rows),
  );

  assert.deepEqual(result.map((aggregate) => aggregate.id), ["day-1", "month-1"]);
  assert.equal(result[0]?.companyId, "company-1");
  assert.equal(result[0]?.periodStart, "2026-04-20T00:00:00.000Z");
  assert.equal(result[0]?.totalCostNanoUsd, 4_200);
  assert.equal(result[0]?.totalTokens, 35);
});

test("LlmUsageAggregatesQueryResolver rejects another company scope id", async () => {
  const resolver = new LlmUsageAggregatesQueryResolver();

  await assert.rejects(
    resolver.execute(
      null,
      {
        input: {
          scopeId: "company-2",
          scopeType: "company",
        },
      },
      LlmUsageAggregatesQueryTestHarness.createContext([]),
    ),
    /Cannot read usage for another company/,
  );
});

test("LlmUsageAggregatesQueryResolver rejects invalid periodStartAfter values", async () => {
  const resolver = new LlmUsageAggregatesQueryResolver();

  await assert.rejects(
    resolver.execute(
      null,
      {
        input: {
          periodStartAfter: "not-a-date",
          scopeType: "provider",
        },
      },
      LlmUsageAggregatesQueryTestHarness.createContext([]),
    ),
    /periodStartAfter must be an ISO date string/,
  );
});
