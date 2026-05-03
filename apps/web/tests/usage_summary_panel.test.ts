import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UsageSummaryPanel } from "../src/components/usage/usage_summary_panel";
import { UsageMetrics } from "../src/lib/usage_metrics";

function createAggregate(input: {
  scopeId?: string;
  spendNanoUsd?: number;
}) {
  return {
    ...UsageMetrics.emptyAggregate("company", input.scopeId ?? "company_1"),
    totalCostNanoUsd: input.spendNanoUsd ?? 0,
  };
}

test("labels provider spend tabs as Spend", () => {
  const html = renderToStaticMarkup(createElement(UsageSummaryPanel, {
    aggregates: [createAggregate({ spendNanoUsd: 1_000_000_000 })],
    description: "Usage summary",
    scopeId: "company_1",
    scopeType: "company",
    title: "Company usage",
  }));

  assert.match(html, />Spend</);
  assert.doesNotMatch(html, />Virtual spend</);
});
