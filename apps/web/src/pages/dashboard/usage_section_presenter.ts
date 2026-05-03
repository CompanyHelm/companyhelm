import { type UsageAggregateRecord, UsageMetrics } from "@/lib/usage_metrics";

export type UsageSectionSpendSummary = {
  spendValue: string;
  supportingText: string;
};

/**
 * Shapes dashboard usage aggregates into compact strings so the overview card can present provider
 * spend without duplicating ledger formatting rules in JSX.
 */
export class UsageSectionPresenter {
  static buildSpendSummary(aggregate: UsageAggregateRecord): UsageSectionSpendSummary {
    return {
      spendValue: UsageMetrics.formatUsdFromNano(aggregate.totalCostNanoUsd),
      supportingText: `${UsageMetrics.formatRequestCount(aggregate.requestCount)} requests • ${UsageMetrics.formatTokenBreakdown(aggregate)}`,
    };
  }
}
