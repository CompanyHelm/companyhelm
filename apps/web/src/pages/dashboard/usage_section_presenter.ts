import { type UsageAggregateRecord, UsageMetrics } from "@/lib/usage_metrics";

export type UsageSectionSpendSummary = {
  actualValue: string;
  supportingText: string;
  virtualValue: string;
};

/**
 * Shapes dashboard usage aggregates into compact strings so the overview card can present actual
 * and virtual spend side by side without duplicating ledger formatting rules in JSX.
 */
export class UsageSectionPresenter {
  static buildSpendSummary(aggregate: UsageAggregateRecord): UsageSectionSpendSummary {
    return {
      actualValue: UsageMetrics.formatUsdFromNano(aggregate.totalCostNanoUsd),
      supportingText: `${UsageMetrics.formatRequestCount(aggregate.requestCount)} requests • ${UsageMetrics.formatTokenBreakdown(aggregate)}`,
      virtualValue: UsageMetrics.formatUsdFromNano(aggregate.totalCostNanoVirtualUsd),
    };
  }
}
