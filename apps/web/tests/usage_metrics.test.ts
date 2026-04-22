import assert from "node:assert/strict";
import { test } from "node:test";
import { UsageMetrics } from "../src/lib/usage_metrics";

test("formats nano USD without exposing floating point storage details", () => {
  assert.equal(UsageMetrics.formatUsdFromNano(0), "$0.00");
  assert.equal(UsageMetrics.formatUsdFromNano(4_900_000), "<$0.01");
  assert.equal(UsageMetrics.formatUsdFromNano(1_250_000_000), "$1.25");
});

test("coerces GraphQL usage aggregates and ignores future enum values", () => {
  const aggregates = UsageMetrics.fromGraphqlAggregates([
    {
      cacheReadCostNanoUsd: 0,
      cacheReadTokens: 0,
      cacheWriteCostNanoUsd: 0,
      cacheWriteTokens: 0,
      inputCostNanoUsd: 100,
      inputTokens: 10,
      outputCostNanoUsd: 200,
      outputTokens: 20,
      period: "total",
      periodStart: "1970-01-01T00:00:00.000Z",
      requestCount: 1,
      scopeId: "company-1",
      scopeType: "company",
      totalCostNanoUsd: 300,
      totalTokens: 30,
    },
    {
      cacheReadCostNanoUsd: 0,
      cacheReadTokens: 0,
      cacheWriteCostNanoUsd: 0,
      cacheWriteTokens: 0,
      inputCostNanoUsd: 100,
      inputTokens: 10,
      outputCostNanoUsd: 200,
      outputTokens: 20,
      period: "%future added value",
      periodStart: "1970-01-01T00:00:00.000Z",
      requestCount: 1,
      scopeId: "company-1",
      scopeType: "company",
      totalCostNanoUsd: 300,
      totalTokens: 30,
    },
  ]);

  assert.equal(aggregates.length, 1);
  assert.equal(aggregates[0]?.period, "total");
  assert.equal(aggregates[0]?.totalTokens, 30);
});

test("returns an empty total aggregate when a scope has no recorded usage", () => {
  const aggregate = UsageMetrics.findTotalAggregate([], "provider", "credential-1");

  assert.equal(aggregate.scopeType, "provider");
  assert.equal(aggregate.scopeId, "credential-1");
  assert.equal(aggregate.totalCostNanoUsd, 0);
  assert.equal(aggregate.totalTokens, 0);
});
