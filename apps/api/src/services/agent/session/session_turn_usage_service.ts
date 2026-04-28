import { randomUUID } from "node:crypto";
import { and, eq, type SQL } from "drizzle-orm";
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
  costKind?: SessionTurnUsageCostKind;
  modelProviderCredentialId: string;
  recordedAt: Date;
  sessionId: string;
  turnId: string;
  usage: SessionTurnUsagePayload;
};

export type SessionTurnUsageCostKind = "actual" | "virtual";

type NormalizedUsage = {
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
  totalCostNanoUsd: number;
  totalCostNanoVirtualUsd: number;
  totalTokens: number;
};

type AggregateScopeType = "company" | "managed_model_provider_credential" | "model_provider_credential" | "agent" | "session";
type AggregatePeriod = "total" | "day" | "month";

type AggregateRecord = {
  agentId: string | null;
  modelProviderCredentialId: string | null;
  period: AggregatePeriod;
  periodStart: Date;
  sessionId: string | null;
  scopeType: AggregateScopeType;
};

/**
 * Applies one assistant-usage payload to the turn ledger and to the live usage rollups. The service
 * keeps the write path deterministic: PI Mono reports dollar-denominated costs, while CompanyHelm
 * stores actual and subscription-equivalent virtual nano-USD values separately so billing UI and
 * limit checks never depend on floating point math or blended spend semantics.
 */
export class SessionTurnUsageService {
  private static readonly nanoUsdPerUsd = 1_000_000_000;

  async recordUsage(
    transactionProvider: TransactionProviderInterface,
    input: SessionTurnUsageRecordInput,
  ): Promise<void> {
    const usage = this.normalizeUsage(input.usage, input.costKind ?? "actual");
    if (!this.hasUsage(usage)) {
      return;
    }

    await transactionProvider.transaction(async (tx) => {
      await tx
        .update(sessionTurns)
        .set({
          usageCacheReadCostNanoUsd: sql`${sessionTurns.usageCacheReadCostNanoUsd} + ${usage.cacheReadCostNanoUsd}`,
          usageCacheReadCostNanoVirtualUsd: sql`${sessionTurns.usageCacheReadCostNanoVirtualUsd} + ${usage.cacheReadCostNanoVirtualUsd}`,
          usageCacheReadTokens: sql`${sessionTurns.usageCacheReadTokens} + ${usage.cacheReadTokens}`,
          usageCacheWriteCostNanoUsd: sql`${sessionTurns.usageCacheWriteCostNanoUsd} + ${usage.cacheWriteCostNanoUsd}`,
          usageCacheWriteCostNanoVirtualUsd: sql`${sessionTurns.usageCacheWriteCostNanoVirtualUsd} + ${usage.cacheWriteCostNanoVirtualUsd}`,
          usageCacheWriteTokens: sql`${sessionTurns.usageCacheWriteTokens} + ${usage.cacheWriteTokens}`,
          usageInputCostNanoUsd: sql`${sessionTurns.usageInputCostNanoUsd} + ${usage.inputCostNanoUsd}`,
          usageInputCostNanoVirtualUsd: sql`${sessionTurns.usageInputCostNanoVirtualUsd} + ${usage.inputCostNanoVirtualUsd}`,
          usageInputTokens: sql`${sessionTurns.usageInputTokens} + ${usage.inputTokens}`,
          usageOutputCostNanoUsd: sql`${sessionTurns.usageOutputCostNanoUsd} + ${usage.outputCostNanoUsd}`,
          usageOutputCostNanoVirtualUsd: sql`${sessionTurns.usageOutputCostNanoVirtualUsd} + ${usage.outputCostNanoVirtualUsd}`,
          usageOutputTokens: sql`${sessionTurns.usageOutputTokens} + ${usage.outputTokens}`,
          usageRecordedAt: input.recordedAt,
          usageTotalCostNanoUsd: sql`${sessionTurns.usageTotalCostNanoUsd} + ${usage.totalCostNanoUsd}`,
          usageTotalCostNanoVirtualUsd: sql`${sessionTurns.usageTotalCostNanoVirtualUsd} + ${usage.totalCostNanoVirtualUsd}`,
          usageTotalTokens: sql`${sessionTurns.usageTotalTokens} + ${usage.totalTokens}`,
        })
        .where(and(
          eq(sessionTurns.companyId, input.companyId),
          eq(sessionTurns.sessionId, input.sessionId),
          eq(sessionTurns.id, input.turnId),
        ));

      for (const aggregateRecord of this.buildAggregateRecords(input)) {
        const conflictTarget = this.resolveAggregateConflictTarget(aggregateRecord);
        await tx
          .insert(llmUsageAggregates)
          .values({
            cacheReadCostNanoUsd: usage.cacheReadCostNanoUsd,
            cacheReadCostNanoVirtualUsd: usage.cacheReadCostNanoVirtualUsd,
            cacheReadTokens: usage.cacheReadTokens,
            cacheWriteCostNanoUsd: usage.cacheWriteCostNanoUsd,
            cacheWriteCostNanoVirtualUsd: usage.cacheWriteCostNanoVirtualUsd,
            cacheWriteTokens: usage.cacheWriteTokens,
            companyId: input.companyId,
            createdAt: input.recordedAt,
            id: randomUUID(),
            inputCostNanoUsd: usage.inputCostNanoUsd,
            inputCostNanoVirtualUsd: usage.inputCostNanoVirtualUsd,
            inputTokens: usage.inputTokens,
            outputCostNanoUsd: usage.outputCostNanoUsd,
            outputCostNanoVirtualUsd: usage.outputCostNanoVirtualUsd,
            outputTokens: usage.outputTokens,
            agentId: aggregateRecord.agentId,
            modelProviderCredentialId: aggregateRecord.modelProviderCredentialId,
            period: aggregateRecord.period,
            periodStart: aggregateRecord.periodStart,
            requestCount: 1,
            sessionId: aggregateRecord.sessionId,
            scopeType: aggregateRecord.scopeType,
            totalCostNanoUsd: usage.totalCostNanoUsd,
            totalCostNanoVirtualUsd: usage.totalCostNanoVirtualUsd,
            totalTokens: usage.totalTokens,
            updatedAt: input.recordedAt,
          })
          .onConflictDoUpdate({
            target: conflictTarget.target as never,
            targetWhere: conflictTarget.targetWhere,
            set: {
              cacheReadCostNanoUsd: sql`${llmUsageAggregates.cacheReadCostNanoUsd} + ${usage.cacheReadCostNanoUsd}`,
              cacheReadCostNanoVirtualUsd: sql`${llmUsageAggregates.cacheReadCostNanoVirtualUsd} + ${usage.cacheReadCostNanoVirtualUsd}`,
              cacheReadTokens: sql`${llmUsageAggregates.cacheReadTokens} + ${usage.cacheReadTokens}`,
              cacheWriteCostNanoUsd: sql`${llmUsageAggregates.cacheWriteCostNanoUsd} + ${usage.cacheWriteCostNanoUsd}`,
              cacheWriteCostNanoVirtualUsd: sql`${llmUsageAggregates.cacheWriteCostNanoVirtualUsd} + ${usage.cacheWriteCostNanoVirtualUsd}`,
              cacheWriteTokens: sql`${llmUsageAggregates.cacheWriteTokens} + ${usage.cacheWriteTokens}`,
              inputCostNanoUsd: sql`${llmUsageAggregates.inputCostNanoUsd} + ${usage.inputCostNanoUsd}`,
              inputCostNanoVirtualUsd: sql`${llmUsageAggregates.inputCostNanoVirtualUsd} + ${usage.inputCostNanoVirtualUsd}`,
              inputTokens: sql`${llmUsageAggregates.inputTokens} + ${usage.inputTokens}`,
              outputCostNanoUsd: sql`${llmUsageAggregates.outputCostNanoUsd} + ${usage.outputCostNanoUsd}`,
              outputCostNanoVirtualUsd: sql`${llmUsageAggregates.outputCostNanoVirtualUsd} + ${usage.outputCostNanoVirtualUsd}`,
              outputTokens: sql`${llmUsageAggregates.outputTokens} + ${usage.outputTokens}`,
              requestCount: sql`${llmUsageAggregates.requestCount} + 1`,
              totalCostNanoUsd: sql`${llmUsageAggregates.totalCostNanoUsd} + ${usage.totalCostNanoUsd}`,
              totalCostNanoVirtualUsd: sql`${llmUsageAggregates.totalCostNanoVirtualUsd} + ${usage.totalCostNanoVirtualUsd}`,
              totalTokens: sql`${llmUsageAggregates.totalTokens} + ${usage.totalTokens}`,
              updatedAt: input.recordedAt,
            },
          });
      }
    });
  }

  private normalizeUsage(usage: SessionTurnUsagePayload, costKind: SessionTurnUsageCostKind): NormalizedUsage {
    const inputTokens = this.resolveTokenCount(usage.input);
    const outputTokens = this.resolveTokenCount(usage.output);
    const cacheReadTokens = this.resolveTokenCount(usage.cacheRead);
    const cacheWriteTokens = this.resolveTokenCount(usage.cacheWrite);
    const derivedTotalTokens = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
    const totalTokens = this.resolveTokenCount(usage.totalTokens) || derivedTotalTokens;

    const resolvedInputCostNanoUsd = this.resolveNanoUsd(usage.cost?.input);
    const resolvedOutputCostNanoUsd = this.resolveNanoUsd(usage.cost?.output);
    const resolvedCacheReadCostNanoUsd = this.resolveNanoUsd(usage.cost?.cacheRead);
    const resolvedCacheWriteCostNanoUsd = this.resolveNanoUsd(usage.cost?.cacheWrite);
    const derivedTotalCostNanoUsd = resolvedInputCostNanoUsd
      + resolvedOutputCostNanoUsd
      + resolvedCacheReadCostNanoUsd
      + resolvedCacheWriteCostNanoUsd;
    const resolvedTotalCostNanoUsd = this.resolveNanoUsd(usage.cost?.total) || derivedTotalCostNanoUsd;
    const isVirtualCost = costKind === "virtual";

    return {
      cacheReadCostNanoUsd: isVirtualCost ? 0 : resolvedCacheReadCostNanoUsd,
      cacheReadCostNanoVirtualUsd: isVirtualCost ? resolvedCacheReadCostNanoUsd : 0,
      cacheReadTokens,
      cacheWriteCostNanoUsd: isVirtualCost ? 0 : resolvedCacheWriteCostNanoUsd,
      cacheWriteCostNanoVirtualUsd: isVirtualCost ? resolvedCacheWriteCostNanoUsd : 0,
      cacheWriteTokens,
      inputCostNanoUsd: isVirtualCost ? 0 : resolvedInputCostNanoUsd,
      inputCostNanoVirtualUsd: isVirtualCost ? resolvedInputCostNanoUsd : 0,
      inputTokens,
      outputCostNanoUsd: isVirtualCost ? 0 : resolvedOutputCostNanoUsd,
      outputCostNanoVirtualUsd: isVirtualCost ? resolvedOutputCostNanoUsd : 0,
      outputTokens,
      totalCostNanoUsd: isVirtualCost ? 0 : resolvedTotalCostNanoUsd,
      totalCostNanoVirtualUsd: isVirtualCost ? resolvedTotalCostNanoUsd : 0,
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
    return usage.totalTokens > 0 || usage.totalCostNanoUsd > 0 || usage.totalCostNanoVirtualUsd > 0;
  }

  private buildAggregateRecords(input: SessionTurnUsageRecordInput): AggregateRecord[] {
    const dayPeriodStart = this.resolveUtcDayPeriodStart(input.recordedAt);
    const monthPeriodStart = this.resolveUtcMonthPeriodStart(input.recordedAt);
    const modelProviderScopeType = input.costKind === "virtual"
      ? "managed_model_provider_credential"
      : "model_provider_credential";

    return [
      {
        agentId: null,
        modelProviderCredentialId: null,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        sessionId: input.sessionId,
        scopeType: "session",
      },
      {
        agentId: input.agentId,
        modelProviderCredentialId: null,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        sessionId: null,
        scopeType: "agent",
      },
      {
        agentId: input.agentId,
        modelProviderCredentialId: null,
        period: "day",
        periodStart: dayPeriodStart,
        sessionId: null,
        scopeType: "agent",
      },
      {
        agentId: input.agentId,
        modelProviderCredentialId: null,
        period: "month",
        periodStart: monthPeriodStart,
        sessionId: null,
        scopeType: "agent",
      },
      {
        agentId: null,
        modelProviderCredentialId: modelProviderScopeType === "model_provider_credential"
          ? input.modelProviderCredentialId
          : null,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        sessionId: null,
        scopeType: modelProviderScopeType,
      },
      {
        agentId: null,
        modelProviderCredentialId: modelProviderScopeType === "model_provider_credential"
          ? input.modelProviderCredentialId
          : null,
        period: "day",
        periodStart: dayPeriodStart,
        sessionId: null,
        scopeType: modelProviderScopeType,
      },
      {
        agentId: null,
        modelProviderCredentialId: modelProviderScopeType === "model_provider_credential"
          ? input.modelProviderCredentialId
          : null,
        period: "month",
        periodStart: monthPeriodStart,
        sessionId: null,
        scopeType: modelProviderScopeType,
      },
      {
        agentId: null,
        modelProviderCredentialId: null,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        sessionId: null,
        scopeType: "company",
      },
      {
        agentId: null,
        modelProviderCredentialId: null,
        period: "day",
        periodStart: dayPeriodStart,
        sessionId: null,
        scopeType: "company",
      },
      {
        agentId: null,
        modelProviderCredentialId: null,
        period: "month",
        periodStart: monthPeriodStart,
        sessionId: null,
        scopeType: "company",
      },
    ];
  }

  private resolveAggregateConflictTarget(aggregateRecord: AggregateRecord): {
    target: unknown[];
    targetWhere: SQL;
  } {
    if (
      aggregateRecord.scopeType === "company"
      || aggregateRecord.scopeType === "managed_model_provider_credential"
    ) {
      return {
        target: [
          llmUsageAggregates.companyId,
          llmUsageAggregates.scopeType,
          llmUsageAggregates.period,
          llmUsageAggregates.periodStart,
        ],
        targetWhere: sql`${llmUsageAggregates.scopeType} IN ('company', 'managed_model_provider_credential')`,
      };
    }

    if (aggregateRecord.scopeType === "model_provider_credential") {
      return {
        target: [
          llmUsageAggregates.companyId,
          llmUsageAggregates.modelProviderCredentialId,
          llmUsageAggregates.period,
          llmUsageAggregates.periodStart,
        ],
        targetWhere: sql`${llmUsageAggregates.scopeType} = 'model_provider_credential'`,
      };
    }

    if (aggregateRecord.scopeType === "agent") {
      return {
        target: [
          llmUsageAggregates.companyId,
          llmUsageAggregates.agentId,
          llmUsageAggregates.period,
          llmUsageAggregates.periodStart,
        ],
        targetWhere: sql`${llmUsageAggregates.scopeType} = 'agent'`,
      };
    }

    return {
      target: [
        llmUsageAggregates.companyId,
        llmUsageAggregates.sessionId,
        llmUsageAggregates.period,
        llmUsageAggregates.periodStart,
      ],
      targetWhere: sql`${llmUsageAggregates.scopeType} = 'session'`,
    };
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
