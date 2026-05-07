import { randomUUID } from "node:crypto";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { injectable } from "inversify";
import { llmUsageAggregates, sessionTurns } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import type {
  SessionTurnUsageCostKind,
  SessionTurnUsagePayload,
  SessionTurnUsageRecordInput,
} from "./session_turn_usage_service.ts";

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

type AggregateScopeType = "company" | "model_provider_credential" | "agent" | "session";
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
 * Applies one turn's finalized usage exactly once. OSS stores real and optional virtual cost
 * accounting for visibility, but it does not reintroduce any cloud-only platform billing or model
 * routing concepts.
 */
@injectable()
export class SessionTurnUsageProcessor {
  private static readonly nanoUsdPerUsd = 1_000_000_000;

  async processUsage(
    transactionProvider: TransactionProviderInterface,
    input: SessionTurnUsageRecordInput,
  ): Promise<void> {
    const recordedAt = this.normalizeRecordedAt(input.recordedAt);
    const usage = this.normalizeUsage(input.usage, input.costKind ?? "actual");
    if (!this.hasUsage(usage)) {
      return;
    }

    await transactionProvider.transaction(async (tx) => {
      const [updatedTurn] = await tx
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
          usageRecordedAt: recordedAt,
          usageTotalCostNanoUsd: sql`${sessionTurns.usageTotalCostNanoUsd} + ${usage.totalCostNanoUsd}`,
          usageTotalCostNanoVirtualUsd: sql`${sessionTurns.usageTotalCostNanoVirtualUsd} + ${usage.totalCostNanoVirtualUsd}`,
          usageTotalTokens: sql`${sessionTurns.usageTotalTokens} + ${usage.totalTokens}`,
        })
        .where(and(
          eq(sessionTurns.companyId, input.companyId),
          eq(sessionTurns.sessionId, input.sessionId),
          eq(sessionTurns.id, input.turnId),
          isNull(sessionTurns.usageRecordedAt),
        ))
        .returning({ id: sessionTurns.id });
      if (!updatedTurn) {
        return;
      }

      for (const aggregateRecord of this.buildAggregateRecords(input, recordedAt)) {
        const conflictTarget = this.resolveAggregateConflictTarget(aggregateRecord);
        await tx
          .insert(llmUsageAggregates)
          .values({
            agentId: aggregateRecord.agentId,
            cacheReadCostNanoUsd: usage.cacheReadCostNanoUsd,
            cacheReadCostNanoVirtualUsd: usage.cacheReadCostNanoVirtualUsd,
            cacheReadTokens: usage.cacheReadTokens,
            cacheWriteCostNanoUsd: usage.cacheWriteCostNanoUsd,
            cacheWriteCostNanoVirtualUsd: usage.cacheWriteCostNanoVirtualUsd,
            cacheWriteTokens: usage.cacheWriteTokens,
            companyId: input.companyId,
            createdAt: recordedAt,
            id: randomUUID(),
            inputCostNanoUsd: usage.inputCostNanoUsd,
            inputCostNanoVirtualUsd: usage.inputCostNanoVirtualUsd,
            inputTokens: usage.inputTokens,
            modelProviderCredentialId: aggregateRecord.modelProviderCredentialId,
            outputCostNanoUsd: usage.outputCostNanoUsd,
            outputCostNanoVirtualUsd: usage.outputCostNanoVirtualUsd,
            outputTokens: usage.outputTokens,
            period: aggregateRecord.period,
            periodStart: aggregateRecord.periodStart,
            requestCount: 1,
            scopeType: aggregateRecord.scopeType,
            sessionId: aggregateRecord.sessionId,
            totalCostNanoUsd: usage.totalCostNanoUsd,
            totalCostNanoVirtualUsd: usage.totalCostNanoVirtualUsd,
            totalTokens: usage.totalTokens,
            updatedAt: recordedAt,
          })
          .onConflictDoUpdate({
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
              updatedAt: recordedAt,
            },
            target: conflictTarget.target as never,
            targetWhere: conflictTarget.targetWhere,
          });
      }
    });
  }

  private normalizeRecordedAt(value: Date | string): Date {
    if (value instanceof Date) {
      return value;
    }

    const recordedAt = new Date(value);
    if (Number.isNaN(recordedAt.getTime())) {
      throw new Error("Session turn usage recordedAt is invalid.");
    }

    return recordedAt;
  }

  private normalizeUsage(usage: SessionTurnUsagePayload, costKind: SessionTurnUsageCostKind): NormalizedUsage {
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
    const isVirtualCost = costKind === "virtual";

    return {
      cacheReadCostNanoUsd: isVirtualCost ? 0 : cacheReadCostNanoUsd,
      cacheReadCostNanoVirtualUsd: isVirtualCost ? cacheReadCostNanoUsd : 0,
      cacheReadTokens,
      cacheWriteCostNanoUsd: isVirtualCost ? 0 : cacheWriteCostNanoUsd,
      cacheWriteCostNanoVirtualUsd: isVirtualCost ? cacheWriteCostNanoUsd : 0,
      cacheWriteTokens,
      inputCostNanoUsd: isVirtualCost ? 0 : inputCostNanoUsd,
      inputCostNanoVirtualUsd: isVirtualCost ? inputCostNanoUsd : 0,
      inputTokens,
      outputCostNanoUsd: isVirtualCost ? 0 : outputCostNanoUsd,
      outputCostNanoVirtualUsd: isVirtualCost ? outputCostNanoUsd : 0,
      outputTokens,
      totalCostNanoUsd: isVirtualCost ? 0 : totalCostNanoUsd,
      totalCostNanoVirtualUsd: isVirtualCost ? totalCostNanoUsd : 0,
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

    return Math.round(value * SessionTurnUsageProcessor.nanoUsdPerUsd);
  }

  private hasUsage(usage: NormalizedUsage): boolean {
    return usage.totalTokens > 0 || usage.totalCostNanoUsd > 0 || usage.totalCostNanoVirtualUsd > 0;
  }

  private buildAggregateRecords(input: SessionTurnUsageRecordInput, recordedAt: Date): AggregateRecord[] {
    const dayPeriodStart = this.resolveUtcDayPeriodStart(recordedAt);
    const monthPeriodStart = this.resolveUtcMonthPeriodStart(recordedAt);

    return [
      {
        agentId: null,
        modelProviderCredentialId: null,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        scopeType: "session",
        sessionId: input.sessionId,
      },
      {
        agentId: input.agentId,
        modelProviderCredentialId: null,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        scopeType: "agent",
        sessionId: null,
      },
      {
        agentId: input.agentId,
        modelProviderCredentialId: null,
        period: "day",
        periodStart: dayPeriodStart,
        scopeType: "agent",
        sessionId: null,
      },
      {
        agentId: input.agentId,
        modelProviderCredentialId: null,
        period: "month",
        periodStart: monthPeriodStart,
        scopeType: "agent",
        sessionId: null,
      },
      {
        agentId: null,
        modelProviderCredentialId: input.modelProviderCredentialId,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        scopeType: "model_provider_credential",
        sessionId: null,
      },
      {
        agentId: null,
        modelProviderCredentialId: input.modelProviderCredentialId,
        period: "day",
        periodStart: dayPeriodStart,
        scopeType: "model_provider_credential",
        sessionId: null,
      },
      {
        agentId: null,
        modelProviderCredentialId: input.modelProviderCredentialId,
        period: "month",
        periodStart: monthPeriodStart,
        scopeType: "model_provider_credential",
        sessionId: null,
      },
      {
        agentId: null,
        modelProviderCredentialId: null,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        scopeType: "company",
        sessionId: null,
      },
      {
        agentId: null,
        modelProviderCredentialId: null,
        period: "day",
        periodStart: dayPeriodStart,
        scopeType: "company",
        sessionId: null,
      },
      {
        agentId: null,
        modelProviderCredentialId: null,
        period: "month",
        periodStart: monthPeriodStart,
        scopeType: "company",
        sessionId: null,
      },
    ];
  }

  private resolveAggregateConflictTarget(aggregateRecord: AggregateRecord): {
    target: unknown[];
    targetWhere: SQL;
  } {
    if (aggregateRecord.scopeType === "company") {
      return {
        target: [
          llmUsageAggregates.companyId,
          llmUsageAggregates.scopeType,
          llmUsageAggregates.period,
          llmUsageAggregates.periodStart,
        ],
        targetWhere: sql`${llmUsageAggregates.scopeType} = 'company'`,
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
