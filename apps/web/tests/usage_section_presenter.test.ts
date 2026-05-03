import assert from "node:assert/strict";
import { test } from "node:test";
import { UsageMetrics } from "../src/lib/usage_metrics";
import { UsageSectionPresenter } from "../src/pages/dashboard/usage_section_presenter";

test("builds split actual and virtual spend values for the dashboard usage card", () => {
  const aggregate = {
    ...UsageMetrics.emptyAggregate("company", "company_1"),
    cacheReadTokens: 250,
    inputTokens: 1500,
    outputTokens: 500,
    requestCount: 12,
    totalCostNanoUsd: 1_500_000_000,
    totalCostNanoVirtualUsd: 2_750_000_000,
    totalTokens: 2250,
  };

  const summary = UsageSectionPresenter.buildSpendSummary(aggregate);

  assert.equal(summary.actualValue, "$1.50");
  assert.equal(summary.virtualValue, "$2.75");
  assert.equal(summary.supportingText, "12 requests • 1,500 input, 500 output, 250 cache");
});
