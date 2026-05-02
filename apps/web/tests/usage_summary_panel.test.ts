import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UsageSummaryPanel } from "../src/components/usage/usage_summary_panel";
import { UsageMetrics } from "../src/lib/usage_metrics";

function createAggregate(input: {
  actualNanoUsd?: number;
  scopeId?: string;
  virtualNanoUsd?: number;
}) {
  return {
    ...UsageMetrics.emptyAggregate("company", input.scopeId ?? "company_1"),
    totalCostNanoUsd: input.actualNanoUsd ?? 0,
    totalCostNanoVirtualUsd: input.virtualNanoUsd ?? 0,
  };
}

test("labels virtual-only spend tabs as Virtual spend", () => {
  const html = renderToStaticMarkup(createElement(UsageSummaryPanel, {
    aggregates: [createAggregate({ virtualNanoUsd: 1_000_000_000 })],
    description: "Usage summary",
    scopeId: "company_1",
    scopeType: "company",
    spendKind: "virtual",
    title: "Company usage",
  }));

  assert.match(html, />Virtual spend</);
});

test("labels actual spend tabs as Spend", () => {
  const html = renderToStaticMarkup(createElement(UsageSummaryPanel, {
    aggregates: [createAggregate({ actualNanoUsd: 1_000_000_000 })],
    description: "Usage summary",
    scopeId: "company_1",
    scopeType: "company",
    spendKind: "actual",
    title: "Company usage",
  }));

  assert.match(html, />Spend</);
  assert.doesNotMatch(html, />Virtual spend</);
});

test("shows separate Spend and Virtual spend tabs when mixed usage needs both views", () => {
  const html = renderToStaticMarkup(createElement(UsageSummaryPanel, {
    aggregates: [createAggregate({ actualNanoUsd: 1_000_000_000, virtualNanoUsd: 2_000_000_000 })],
    description: "Usage summary",
    scopeId: "company_1",
    scopeType: "company",
    spendKind: "split",
    title: "Company usage",
  }));

  assert.match(html, />Spend</);
  assert.match(html, />Virtual spend</);
});
