import { randomUUID } from "node:crypto";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { injectable } from "inversify";
import { llmUsageAggregates, sessionTurns } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import type {
  SessionTurnUsagePayload,
  SessionTurnUsageRecordInput,
} from "./session_turn_usage_service.ts";

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
 * Applies one turn's finalized usage exactly once. Usage remains useful in OSS for token, request,
 * model, and real provider spend visibility, but wallet and virtual-spend accounting are excluded.
 */
@injectable()
export class SessionTurnUsageProcessor {
  private static readonly nanoUsdPerUsd = 1_000_000_000;

  async processUsage(
    transactionProvider: TransactionProviderInterface,
    input: SessionTurnUsageRecordInput,
  ): Promise<void> {
    const recordedAt = this.normalizeRecordedAt(input.recordedAt);
    const usage = this.normalizeUsage(input.usage);
    if (!this.hasUsage(usage)) {
      return;
    }

    await transactionProvider.transaction(async (tx) => {
      const [updatedTurn] = await tx
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
          usageRecordedAt: recordedAt,
          usageTotalCostNanoUsd: sql`${sessionTurns.usageTotalCostNanoUsd} + ${usage.totalCostNanoUsd}`,
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
            cacheReadTokens: usage.cacheReadTokens,
            cacheWriteCostNanoUsd: usage.cacheWriteCostNanoUsd,
            cacheWriteTokens: usage.cacheWriteTokens,
            companyId: input.companyId,
            createdAt: recordedAt,
            id: randomUUID(),
            inputCostNanoUsd: usage.inputCostNanoUsd,
            inputTokens: usage.inputTokens,
            modelProviderCredentialId: aggregateRecord.modelProviderCredentialId,
            outputCostNanoUsd: usage.outputCostNanoUsd,
            outputTokens: usage.outputTokens,
            period: aggregateRecord.period,
            periodStart: aggregateRecord.periodStart,
            requestCount: 1,
            scopeType: aggregateRecord.scopeType,
            sessionId: aggregateRecord.sessionId,
            totalCostNanoUsd: usage.totalCostNanoUsd,
            totalTokens: usage.totalTokens,
            updatedAt: recordedAt,
          })
          .onConflictDoUpdate({
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

    return Math.round(value * SessionTurnUsageProcessor.nanoUsdPerUsd);
  }

  private hasUsage(usage: NormalizedUsage): boolean {
    return usage.totalTokens > 0 || usage.totalCostNanoUsd > 0;
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
