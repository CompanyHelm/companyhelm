export type UsageAggregatePeriod = "total" | "day" | "month";

export type UsageAggregateRecord = {
  cacheReadCostNanoUsd: number;
  cacheReadTokens: number;
  cacheWriteCostNanoUsd: number;
  cacheWriteTokens: number;
  inputCostNanoUsd: number;
  inputTokens: number;
  outputCostNanoUsd: number;
  outputTokens: number;
  period: UsageAggregatePeriod;
  periodStart: string;
  requestCount: number;
  scopeId: string;
  scopeType: string;
  totalCostNanoUsd: number;
  totalTokens: number;
};

type GraphqlUsageAggregateRecord = {
  cacheReadCostNanoUsd: number;
  cacheReadTokens: number;
  cacheWriteCostNanoUsd: number;
  cacheWriteTokens: number;
  inputCostNanoUsd: number;
  inputTokens: number;
  outputCostNanoUsd: number;
  outputTokens: number;
  period: string;
  periodStart: string;
  requestCount: number;
  scopeId: string;
  scopeType: string;
  totalCostNanoUsd: number;
  totalTokens: number;
};

/**
 * Centralizes LLM usage math and formatting so every usage surface presents the aggregate ledger
 * with the same dollar conversion, token abbreviations, and period ordering.
 */
export class UsageMetrics {
  private static readonly nanoUsdPerUsd = 1_000_000_000;

  static fromGraphqlAggregates(records: ReadonlyArray<GraphqlUsageAggregateRecord>): UsageAggregateRecord[] {
    return records.flatMap((record) => {
      const period = UsageMetrics.resolvePeriod(record.period);
      if (!period) {
        return [];
      }

      return [{
        cacheReadCostNanoUsd: record.cacheReadCostNanoUsd,
        cacheReadTokens: record.cacheReadTokens,
        cacheWriteCostNanoUsd: record.cacheWriteCostNanoUsd,
        cacheWriteTokens: record.cacheWriteTokens,
        inputCostNanoUsd: record.inputCostNanoUsd,
        inputTokens: record.inputTokens,
        outputCostNanoUsd: record.outputCostNanoUsd,
        outputTokens: record.outputTokens,
        period,
        periodStart: record.periodStart,
        requestCount: record.requestCount,
        scopeId: record.scopeId,
        scopeType: record.scopeType,
        totalCostNanoUsd: record.totalCostNanoUsd,
        totalTokens: record.totalTokens,
      }];
    });
  }

  static emptyAggregate(scopeType: string, scopeId: string): UsageAggregateRecord {
    return {
      cacheReadCostNanoUsd: 0,
      cacheReadTokens: 0,
      cacheWriteCostNanoUsd: 0,
      cacheWriteTokens: 0,
      inputCostNanoUsd: 0,
      inputTokens: 0,
      outputCostNanoUsd: 0,
      outputTokens: 0,
      period: "total",
      periodStart: new Date(0).toISOString(),
      requestCount: 0,
      scopeId,
      scopeType,
      totalCostNanoUsd: 0,
      totalTokens: 0,
    };
  }

  static findTotalAggregate(
    aggregates: ReadonlyArray<UsageAggregateRecord>,
    scopeType: string,
    scopeId: string,
  ): UsageAggregateRecord {
    return aggregates.find((aggregate) => {
      return aggregate.period === "total" && aggregate.scopeId === scopeId && aggregate.scopeType === scopeType;
    }) ?? UsageMetrics.emptyAggregate(scopeType, scopeId);
  }

  static sortPeriodAggregates(aggregates: ReadonlyArray<UsageAggregateRecord>): UsageAggregateRecord[] {
    return [...aggregates].sort((left, right) => {
      return new Date(left.periodStart).getTime() - new Date(right.periodStart).getTime();
    });
  }

  static filterPeriodAggregates(
    aggregates: ReadonlyArray<UsageAggregateRecord>,
    period: UsageAggregatePeriod,
  ): UsageAggregateRecord[] {
    return UsageMetrics.sortPeriodAggregates(
      aggregates.filter((aggregate) => aggregate.period === period),
    );
  }

  static formatUsdFromNano(nanoUsd: number): string {
    const usd = nanoUsd / UsageMetrics.nanoUsdPerUsd;
    if (usd === 0) {
      return "$0.00";
    }
    if (usd < 0.01) {
      return "<$0.01";
    }

    return new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: usd >= 100 ? 0 : 2,
      minimumFractionDigits: usd >= 100 ? 0 : 2,
      style: "currency",
    }).format(usd);
  }

  static formatTokenCount(tokens: number): string {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: tokens >= 1_000_000 ? 1 : 0,
      notation: tokens >= 10_000 ? "compact" : "standard",
    }).format(tokens);
  }

  static formatRequestCount(requests: number): string {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
      notation: requests >= 10_000 ? "compact" : "standard",
    }).format(requests);
  }

  static formatPeriodLabel(periodStart: string, period: UsageAggregatePeriod): string {
    const date = new Date(periodStart);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    if (period === "month") {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      }).format(date);
    }

    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(date);
  }

  static resolveBarWidth(value: number, maxValue: number): string {
    if (value <= 0 || maxValue <= 0) {
      return "0%";
    }

    return `${Math.max(4, Math.round((value / maxValue) * 100))}%`;
  }

  static resolveUtcDayStart(daysBack: number): string {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack)).toISOString();
  }

  static resolveUtcMonthStart(monthsBack: number): string {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1)).toISOString();
  }

  private static resolvePeriod(value: string): UsageAggregatePeriod | null {
    if (value === "day" || value === "month" || value === "total") {
      return value;
    }

    return null;
  }
}
