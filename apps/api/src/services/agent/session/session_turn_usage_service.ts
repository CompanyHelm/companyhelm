import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { llmUsageAggregates, sessionTurns } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";

export type SessionTurnUsagePayload = {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  totalTokens?: number;
  cost?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    total?: number;
  };
};

export type SessionTurnUsageRecordInput = {
  agentId: string;
  companyId: string;
  recordedAt: Date;
  sessionId: string;
  turnId: string;
  usage: SessionTurnUsagePayload;
};

type NormalizedUsage = {
  cacheReadCostNanoUsd: number;
  cacheReadTokens: number;
  cacheWriteCostNanoUsd: number;
  cacheWriteTokens: number;
  inputCostNanoUsd: number;
  inputTokens: number;
  outputCostNanoUsd: number;
  outputTokens: number;
  totalCostNanoUsd: number;
  totalTokens: number;
};

type AggregateScopeType = "company" | "agent" | "session";
type AggregatePeriod = "total" | "day" | "month";

type AggregateRecord = {
  period: AggregatePeriod;
  periodStart: Date;
  scopeId: string;
  scopeType: AggregateScopeType;
};

/**
 * Applies one assistant-usage payload to the turn ledger and to the live usage rollups. The service
 * keeps the write path deterministic: PI Mono reports dollar-denominated costs, while CompanyHelm
 * stores integer nano-USD values so later UI and limit checks never depend on floating point math.
 */
export class SessionTurnUsageService {
  private static readonly nanoUsdPerUsd = 1_000_000_000;

  async recordUsage(
    transactionProvider: TransactionProviderInterface,
    input: SessionTurnUsageRecordInput,
  ): Promise<void> {
    const usage = this.normalizeUsage(input.usage);
    if (!this.hasUsage(usage)) {
      return;
    }

    await transactionProvider.transaction(async (tx) => {
      await tx
        .update(sessionTurns)
        .set({
          usageCacheReadCostNanoUsd: sql`${sessionTurns.usageCacheReadCostNanoUsd} + ${usage.cacheReadCostNanoUsd}`,
          usageCacheReadTokens: sql`${sessionTurns.usageCacheReadTokens} + ${usage.cacheReadTokens}`,
          usageCacheWriteCostNanoUsd: sql`${sessionTurns.usageCacheWriteCostNanoUsd} + ${usage.cacheWriteCostNanoUsd}`,
          usageCacheWriteTokens: sql`${sessionTurns.usageCacheWriteTokens} + ${usage.cacheWriteTokens}`,
          usageInputCostNanoUsd: sql`${sessionTurns.usageInputCostNanoUsd} + ${usage.inputCostNanoUsd}`,
          usageInputTokens: sql`${sessionTurns.usageInputTokens} + ${usage.inputTokens}`,
          usageOutputCostNanoUsd: sql`${sessionTurns.usageOutputCostNanoUsd} + ${usage.outputCostNanoUsd}`,
          usageOutputTokens: sql`${sessionTurns.usageOutputTokens} + ${usage.outputTokens}`,
          usageRecordedAt: input.recordedAt,
          usageTotalCostNanoUsd: sql`${sessionTurns.usageTotalCostNanoUsd} + ${usage.totalCostNanoUsd}`,
          usageTotalTokens: sql`${sessionTurns.usageTotalTokens} + ${usage.totalTokens}`,
        })
        .where(and(
          eq(sessionTurns.companyId, input.companyId),
          eq(sessionTurns.sessionId, input.sessionId),
          eq(sessionTurns.id, input.turnId),
        ));

      for (const aggregateRecord of this.buildAggregateRecords(input)) {
        await tx
          .insert(llmUsageAggregates)
          .values({
            cacheReadCostNanoUsd: usage.cacheReadCostNanoUsd,
            cacheReadTokens: usage.cacheReadTokens,
            cacheWriteCostNanoUsd: usage.cacheWriteCostNanoUsd,
            cacheWriteTokens: usage.cacheWriteTokens,
            companyId: input.companyId,
            createdAt: input.recordedAt,
            id: randomUUID(),
            inputCostNanoUsd: usage.inputCostNanoUsd,
            inputTokens: usage.inputTokens,
            outputCostNanoUsd: usage.outputCostNanoUsd,
            outputTokens: usage.outputTokens,
            period: aggregateRecord.period,
            periodStart: aggregateRecord.periodStart,
            requestCount: 1,
            scopeId: aggregateRecord.scopeId,
            scopeType: aggregateRecord.scopeType,
            totalCostNanoUsd: usage.totalCostNanoUsd,
            totalTokens: usage.totalTokens,
            updatedAt: input.recordedAt,
          })
          .onConflictDoUpdate({
            target: [
              llmUsageAggregates.companyId,
              llmUsageAggregates.scopeType,
              llmUsageAggregates.scopeId,
              llmUsageAggregates.period,
              llmUsageAggregates.periodStart,
            ],
            set: {
              cacheReadCostNanoUsd: sql`${llmUsageAggregates.cacheReadCostNanoUsd} + ${usage.cacheReadCostNanoUsd}`,
              cacheReadTokens: sql`${llmUsageAggregates.cacheReadTokens} + ${usage.cacheReadTokens}`,
              cacheWriteCostNanoUsd: sql`${llmUsageAggregates.cacheWriteCostNanoUsd} + ${usage.cacheWriteCostNanoUsd}`,
              cacheWriteTokens: sql`${llmUsageAggregates.cacheWriteTokens} + ${usage.cacheWriteTokens}`,
              inputCostNanoUsd: sql`${llmUsageAggregates.inputCostNanoUsd} + ${usage.inputCostNanoUsd}`,
              inputTokens: sql`${llmUsageAggregates.inputTokens} + ${usage.inputTokens}`,
              outputCostNanoUsd: sql`${llmUsageAggregates.outputCostNanoUsd} + ${usage.outputCostNanoUsd}`,
              outputTokens: sql`${llmUsageAggregates.outputTokens} + ${usage.outputTokens}`,
              requestCount: sql`${llmUsageAggregates.requestCount} + 1`,
              totalCostNanoUsd: sql`${llmUsageAggregates.totalCostNanoUsd} + ${usage.totalCostNanoUsd}`,
              totalTokens: sql`${llmUsageAggregates.totalTokens} + ${usage.totalTokens}`,
              updatedAt: input.recordedAt,
            },
          });
      }
    });
  }

  private normalizeUsage(usage: SessionTurnUsagePayload): NormalizedUsage {
    const inputTokens = this.resolveTokenCount(usage.input);
    const outputTokens = this.resolveTokenCount(usage.output);
    const cacheReadTokens = this.resolveTokenCount(usage.cacheRead);
    const cacheWriteTokens = this.resolveTokenCount(usage.cacheWrite);
    const derivedTotalTokens = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
    const totalTokens = this.resolveTokenCount(usage.totalTokens) || derivedTotalTokens;

    const inputCostNanoUsd = this.resolveNanoUsd(usage.cost?.input);
    const outputCostNanoUsd = this.resolveNanoUsd(usage.cost?.output);
    const cacheReadCostNanoUsd = this.resolveNanoUsd(usage.cost?.cacheRead);
    const cacheWriteCostNanoUsd = this.resolveNanoUsd(usage.cost?.cacheWrite);
    const derivedTotalCostNanoUsd = inputCostNanoUsd
      + outputCostNanoUsd
      + cacheReadCostNanoUsd
      + cacheWriteCostNanoUsd;
    const totalCostNanoUsd = this.resolveNanoUsd(usage.cost?.total) || derivedTotalCostNanoUsd;

    return {
      cacheReadCostNanoUsd,
      cacheReadTokens,
      cacheWriteCostNanoUsd,
      cacheWriteTokens,
      inputCostNanoUsd,
      inputTokens,
      outputCostNanoUsd,
      outputTokens,
      totalCostNanoUsd,
      totalTokens,
    };
  }

  private resolveTokenCount(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return Math.trunc(value);
  }

  private resolveNanoUsd(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return Math.round(value * SessionTurnUsageService.nanoUsdPerUsd);
  }

  private hasUsage(usage: NormalizedUsage): boolean {
    return usage.totalTokens > 0 || usage.totalCostNanoUsd > 0;
  }

  private buildAggregateRecords(input: SessionTurnUsageRecordInput): AggregateRecord[] {
    const dayPeriodStart = this.resolveUtcDayPeriodStart(input.recordedAt);
    const monthPeriodStart = this.resolveUtcMonthPeriodStart(input.recordedAt);

    return [
      {
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        scopeId: input.sessionId,
        scopeType: "session",
      },
      {
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        scopeId: input.agentId,
        scopeType: "agent",
      },
      {
        period: "day",
        periodStart: dayPeriodStart,
        scopeId: input.agentId,
        scopeType: "agent",
      },
      {
        period: "month",
        periodStart: monthPeriodStart,
        scopeId: input.agentId,
        scopeType: "agent",
      },
      {
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        scopeId: input.companyId,
        scopeType: "company",
      },
      {
        period: "day",
        periodStart: dayPeriodStart,
        scopeId: input.companyId,
        scopeType: "company",
      },
      {
        period: "month",
        periodStart: monthPeriodStart,
        scopeId: input.companyId,
        scopeType: "company",
      },
    ];
  }

  private resolveUtcDayPeriodStart(recordedAt: Date): Date {
    return new Date(Date.UTC(
      recordedAt.getUTCFullYear(),
      recordedAt.getUTCMonth(),
      recordedAt.getUTCDate(),
    ));
  }

  private resolveUtcMonthPeriodStart(recordedAt: Date): Date {
    return new Date(Date.UTC(recordedAt.getUTCFullYear(), recordedAt.getUTCMonth(), 1));
  }

  private resolveTotalPeriodStart(): Date {
    return new Date(0);
  }
}
