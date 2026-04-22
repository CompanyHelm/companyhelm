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

test("finds current period aggregates and falls back to period-specific empty records", () => {
  const monthlyStart = UsageMetrics.resolveUtcMonthStart(0);
  const monthlyAggregate = UsageMetrics.emptyAggregate("company", "company-1", "month", monthlyStart);
  monthlyAggregate.totalCostNanoUsd = 7_000_000_000;
  monthlyAggregate.totalTokens = 900;

  const resolvedMonthlyAggregate = UsageMetrics.findCurrentMonthAggregate(
    [monthlyAggregate],
    "company",
    "company-1",
  );
  const missingDailyAggregate = UsageMetrics.findCurrentDayAggregate([], "company", "company-1");

  assert.equal(resolvedMonthlyAggregate.totalCostNanoUsd, 7_000_000_000);
  assert.equal(resolvedMonthlyAggregate.totalTokens, 900);
  assert.equal(missingDailyAggregate.period, "day");
  assert.equal(missingDailyAggregate.totalTokens, 0);
});

test("builds a continuous recent daily series for bar charts", () => {
  const todayStart = UsageMetrics.resolveUtcDayStart(0);
  const todayAggregate = UsageMetrics.emptyAggregate("provider", "credential-1", "day", todayStart);
  todayAggregate.totalCostNanoUsd = 1_500_000_000;
  todayAggregate.totalTokens = 42;

  const rows = UsageMetrics.buildRecentDailyAggregates(
    [todayAggregate],
    "provider",
    "credential-1",
    3,
  );

  assert.equal(rows.length, 3);
  assert.equal(rows[0]?.period, "day");
  assert.equal(rows[0]?.totalTokens, 0);
  assert.equal(rows[2]?.periodStart, todayStart);
  assert.equal(rows[2]?.totalCostNanoUsd, 1_500_000_000);
  assert.equal(rows[2]?.totalTokens, 42);
});
