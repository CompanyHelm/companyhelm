export type UsageAggregatePeriod = "total" | "day" | "month";

export type UsageAggregateRecord = {
  cacheReadCostNanoUsd: number;
  cacheReadCostNanoVirtualUsd: number;
  cacheReadTokens: number;
  cacheWriteCostNanoUsd: number;
  cacheWriteCostNanoVirtualUsd: number;
  cacheWriteTokens: number;
  inputCostNanoUsd: number;
  inputCostNanoVirtualUsd: number;
  inputTokens: number;
  outputCostNanoUsd: number;
  outputCostNanoVirtualUsd: number;
  outputTokens: number;
  period: UsageAggregatePeriod;
  periodStart: string;
  requestCount: number;
  scopeId: string;
  scopeType: string;
  totalCostNanoUsd: number;
  totalCostNanoVirtualUsd: number;
  totalTokens: number;
};

type GraphqlUsageAggregateRecord = {
  cacheReadCostNanoUsd: number;
  cacheReadCostNanoVirtualUsd?: number;
  cacheReadTokens: number;
  cacheWriteCostNanoUsd: number;
  cacheWriteCostNanoVirtualUsd?: number;
  cacheWriteTokens: number;
  inputCostNanoUsd: number;
  inputCostNanoVirtualUsd?: number;
  inputTokens: number;
  outputCostNanoUsd: number;
  outputCostNanoVirtualUsd?: number;
  outputTokens: number;
  period: string;
  periodStart: string;
  requestCount: number;
  agentId: string | null | undefined;
  companyId: string;
  modelProviderCredentialId: string | null | undefined;
  sessionId: string | null | undefined;
  scopeType: string;
  totalCostNanoUsd: number;
  totalCostNanoVirtualUsd?: number;
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
        cacheReadCostNanoVirtualUsd: record.cacheReadCostNanoVirtualUsd ?? 0,
        cacheReadTokens: record.cacheReadTokens,
        cacheWriteCostNanoUsd: record.cacheWriteCostNanoUsd,
        cacheWriteCostNanoVirtualUsd: record.cacheWriteCostNanoVirtualUsd ?? 0,
        cacheWriteTokens: record.cacheWriteTokens,
        inputCostNanoUsd: record.inputCostNanoUsd,
        inputCostNanoVirtualUsd: record.inputCostNanoVirtualUsd ?? 0,
        inputTokens: record.inputTokens,
        outputCostNanoUsd: record.outputCostNanoUsd,
        outputCostNanoVirtualUsd: record.outputCostNanoVirtualUsd ?? 0,
        outputTokens: record.outputTokens,
        period,
        periodStart: record.periodStart,
        requestCount: record.requestCount,
        scopeId: UsageMetrics.resolveGraphqlScopeId(record),
        scopeType: record.scopeType,
        totalCostNanoUsd: record.totalCostNanoUsd,
        totalCostNanoVirtualUsd: record.totalCostNanoVirtualUsd ?? 0,
        totalTokens: record.totalTokens,
      }];
    });
  }

  private static resolveGraphqlScopeId(record: GraphqlUsageAggregateRecord): string {
    if (record.scopeType === "model_provider_credential") {
      return record.modelProviderCredentialId ?? "";
    }
    if (record.scopeType === "agent") {
      return record.agentId ?? "";
    }
    if (record.scopeType === "session") {
      return record.sessionId ?? "";
    }

    return record.companyId;
  }

  static emptyAggregate(
    scopeType: string,
    scopeId: string,
    period: UsageAggregatePeriod = "total",
    periodStart = new Date(0).toISOString(),
  ): UsageAggregateRecord {
    return {
      cacheReadCostNanoUsd: 0,
      cacheReadCostNanoVirtualUsd: 0,
      cacheReadTokens: 0,
      cacheWriteCostNanoUsd: 0,
      cacheWriteCostNanoVirtualUsd: 0,
      cacheWriteTokens: 0,
      inputCostNanoUsd: 0,
      inputCostNanoVirtualUsd: 0,
      inputTokens: 0,
      outputCostNanoUsd: 0,
      outputCostNanoVirtualUsd: 0,
      outputTokens: 0,
      period,
      periodStart,
      requestCount: 0,
      scopeId,
      scopeType,
      totalCostNanoUsd: 0,
      totalCostNanoVirtualUsd: 0,
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

  static findPeriodAggregate(
    aggregates: ReadonlyArray<UsageAggregateRecord>,
    scopeType: string,
    scopeId: string,
    period: UsageAggregatePeriod,
    periodStart: string,
  ): UsageAggregateRecord {
    const targetKey = UsageMetrics.resolveUtcPeriodKey(periodStart, period);

    return aggregates.find((aggregate) => {
      return aggregate.period === period
        && aggregate.scopeId === scopeId
        && aggregate.scopeType === scopeType
        && UsageMetrics.resolveUtcPeriodKey(aggregate.periodStart, period) === targetKey;
    }) ?? UsageMetrics.emptyAggregate(scopeType, scopeId, period, periodStart);
  }

  static findCurrentDayAggregate(
    aggregates: ReadonlyArray<UsageAggregateRecord>,
    scopeType: string,
    scopeId: string,
  ): UsageAggregateRecord {
    return UsageMetrics.findPeriodAggregate(
      aggregates,
      scopeType,
      scopeId,
      "day",
      UsageMetrics.resolveUtcDayStart(0),
    );
  }

  static findCurrentMonthAggregate(
    aggregates: ReadonlyArray<UsageAggregateRecord>,
    scopeType: string,
    scopeId: string,
  ): UsageAggregateRecord {
    return UsageMetrics.findPeriodAggregate(
      aggregates,
      scopeType,
      scopeId,
      "month",
      UsageMetrics.resolveUtcMonthStart(0),
    );
  }

  static buildRecentDailyAggregates(
    aggregates: ReadonlyArray<UsageAggregateRecord>,
    scopeType: string,
    scopeId: string,
    dayCount: number,
  ): UsageAggregateRecord[] {
    return Array.from({ length: dayCount }, (_value, index) => {
      return UsageMetrics.findPeriodAggregate(
        aggregates,
        scopeType,
        scopeId,
        "day",
        UsageMetrics.resolveUtcDayStart(dayCount - index - 1),
      );
    });
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
    if (nanoUsd < 0) {
      return `-${UsageMetrics.formatUsdFromNano(Math.abs(nanoUsd))}`;
    }

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

  static formatTokenBreakdown(aggregate: UsageAggregateRecord): string {
    const cacheTokens = aggregate.cacheReadTokens + aggregate.cacheWriteTokens;
    const parts = [
      `${UsageMetrics.formatTokenCount(aggregate.inputTokens)} input`,
      `${UsageMetrics.formatTokenCount(aggregate.outputTokens)} output`,
    ];

    if (cacheTokens > 0) {
      parts.push(`${UsageMetrics.formatTokenCount(cacheTokens)} cache`);
    }

    return parts.join(", ");
  }

  static resolveCombinedCostNanoUsd(aggregate: UsageAggregateRecord): number {
    return aggregate.totalCostNanoUsd + aggregate.totalCostNanoVirtualUsd;
  }

  static formatCostBreakdown(aggregate: UsageAggregateRecord): string {
    const parts: string[] = [];
    if (aggregate.totalCostNanoUsd > 0) {
      parts.push(`${UsageMetrics.formatUsdFromNano(aggregate.totalCostNanoUsd)} actual`);
    }
    if (aggregate.totalCostNanoVirtualUsd > 0) {
      parts.push(`${UsageMetrics.formatUsdFromNano(aggregate.totalCostNanoVirtualUsd)} virtual`);
    }

    return parts.length > 0 ? parts.join(", ") : "$0.00 actual";
  }

  static formatPeriodLabel(periodStart: string, period: UsageAggregatePeriod): string {
    const date = new Date(periodStart);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    if (period === "month") {
      const formattedMonth = new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      }).format(date);

      return `${formattedMonth} (UTC)`;
    }

    const formattedDay = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(date);

    return `${formattedDay} (UTC)`;
  }

  static resolveBarWidth(value: number, maxValue: number): string {
    return UsageMetrics.resolveBarPercentage(value, maxValue);
  }

  static resolveBarPercentage(value: number, maxValue: number): string {
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

  private static resolveUtcPeriodKey(periodStart: string, period: UsageAggregatePeriod): string {
    const date = new Date(periodStart);
    if (Number.isNaN(date.getTime())) {
      return periodStart;
    }

    if (period === "month") {
      return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    }

    if (period === "day") {
      return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
    }

    return "total";
  }
}
