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
      cacheReadCostNanoVirtualUsd: 50,
      cacheReadTokens: 2,
      cacheWriteCostNanoUsd: 700,
      cacheWriteCostNanoVirtualUsd: 70,
      cacheWriteTokens: 3,
      companyId: "company-1",
      createdAt: new Date("2026-04-20T12:00:00.000Z"),
      id: "aggregate-1",
      inputCostNanoUsd: 1_000,
      inputCostNanoVirtualUsd: 100,
      inputTokens: 10,
      outputCostNanoUsd: 2_000,
      outputCostNanoVirtualUsd: 200,
      outputTokens: 20,
      period: "total",
      periodStart: new Date(0),
      requestCount: 1,
      agentId: null,
      modelCredentialSource: null,
      modelProviderCredentialId: null,
      platformModelProviderCredentialId: null,
      sessionId: null,
      scopeType: "company",
      totalCostNanoUsd: 4_200,
      totalCostNanoVirtualUsd: 420,
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
  assert.equal(result[0]?.totalCostNanoVirtualUsd, 420);
  assert.equal(result[0]?.totalTokens, 35);
});

test("LlmUsageAggregatesQueryResolver requires scope ids for scoped aggregate reads", async () => {
  const resolver = new LlmUsageAggregatesQueryResolver();

  await assert.rejects(
    resolver.execute(
      null,
      {
        input: {
          scopeType: "agent",
        },
      },
      LlmUsageAggregatesQueryTestHarness.createContext([]),
    ),
    /agentId is required for agent usage/,
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
          scopeType: "model_provider_credential",
        },
      },
      LlmUsageAggregatesQueryTestHarness.createContext([]),
    ),
    /periodStartAfter must be an ISO date string/,
  );
});
