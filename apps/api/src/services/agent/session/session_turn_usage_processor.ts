import { randomUUID } from "node:crypto";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { injectable } from "inversify";
import { llmUsageAggregates, sessionTurns } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { CompanyWalletService } from "../../wallet/service.ts";
import type {
  SessionTurnUsageCostKind,
  SessionTurnUsageCredentialSource,
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

type AggregateScopeType = "company" | "managed_model_provider_credential" | "model_provider_credential" | "agent" | "session";
type AggregatePeriod = "total" | "day" | "month";

type AggregateRecord = {
  agentId: string | null;
  modelCredentialSource: SessionTurnUsageCredentialSource | null;
  modelProviderCredentialId: string | null;
  period: AggregatePeriod;
  periodStart: Date;
  platformModelProviderCredentialId: string | null;
  sessionId: string | null;
  scopeType: AggregateScopeType;
};

/**
 * Applies one turn's finalized usage exactly once. Its scope is the durable write path behind the
 * async BullMQ worker, including the session-turn compare-and-swap guard that prevents retries
 * from double-counting usage or recharging the managed wallet after the first successful commit.
 */
@injectable()
export class SessionTurnUsageProcessor {
  private static readonly nanoUsdPerUsd = 1_000_000_000;
  private readonly companyWalletService: CompanyWalletService;

  constructor(companyWalletService: CompanyWalletService = new CompanyWalletService()) {
    this.companyWalletService = companyWalletService;
  }

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
            modelCredentialSource: aggregateRecord.modelCredentialSource,
            modelProviderCredentialId: aggregateRecord.modelProviderCredentialId,
            outputCostNanoUsd: usage.outputCostNanoUsd,
            outputCostNanoVirtualUsd: usage.outputCostNanoVirtualUsd,
            outputTokens: usage.outputTokens,
            period: aggregateRecord.period,
            periodStart: aggregateRecord.periodStart,
            platformModelProviderCredentialId: aggregateRecord.platformModelProviderCredentialId,
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

      if (input.credentialSource === "platform" && usage.totalCostNanoVirtualUsd > 0) {
        await this.companyWalletService.recordManagedLlmChargeInTransaction(tx as never, {
          amountNanoUsd: usage.totalCostNanoVirtualUsd,
          companyId: input.companyId,
          now: recordedAt,
          sessionId: input.sessionId,
          sessionTurnId: input.turnId,
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

    return Math.round(value * SessionTurnUsageProcessor.nanoUsdPerUsd);
  }

  private hasUsage(usage: NormalizedUsage): boolean {
    return usage.totalTokens > 0 || usage.totalCostNanoUsd > 0 || usage.totalCostNanoVirtualUsd > 0;
  }

  private buildAggregateRecords(input: SessionTurnUsageRecordInput, recordedAt: Date): AggregateRecord[] {
    const dayPeriodStart = this.resolveUtcDayPeriodStart(recordedAt);
    const monthPeriodStart = this.resolveUtcMonthPeriodStart(recordedAt);
    const modelProviderCredentialId = input.credentialSource === "user_provided" ? input.modelProviderCredentialId : null;
    const platformModelProviderCredentialId = input.credentialSource === "platform" ? input.modelProviderCredentialId : null;

    return [
      {
        agentId: null,
        modelCredentialSource: null,
        modelProviderCredentialId: null,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        platformModelProviderCredentialId: null,
        scopeType: "session",
        sessionId: input.sessionId,
      },
      {
        agentId: input.agentId,
        modelCredentialSource: null,
        modelProviderCredentialId: null,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        platformModelProviderCredentialId: null,
        scopeType: "agent",
        sessionId: null,
      },
      {
        agentId: input.agentId,
        modelCredentialSource: null,
        modelProviderCredentialId: null,
        period: "day",
        periodStart: dayPeriodStart,
        platformModelProviderCredentialId: null,
        scopeType: "agent",
        sessionId: null,
      },
      {
        agentId: input.agentId,
        modelCredentialSource: null,
        modelProviderCredentialId: null,
        period: "month",
        periodStart: monthPeriodStart,
        platformModelProviderCredentialId: null,
        scopeType: "agent",
        sessionId: null,
      },
      {
        agentId: null,
        modelCredentialSource: input.credentialSource,
        modelProviderCredentialId,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        platformModelProviderCredentialId,
        scopeType: "model_provider_credential",
        sessionId: null,
      },
      {
        agentId: null,
        modelCredentialSource: input.credentialSource,
        modelProviderCredentialId,
        period: "day",
        periodStart: dayPeriodStart,
        platformModelProviderCredentialId,
        scopeType: "model_provider_credential",
        sessionId: null,
      },
      {
        agentId: null,
        modelCredentialSource: input.credentialSource,
        modelProviderCredentialId,
        period: "month",
        periodStart: monthPeriodStart,
        platformModelProviderCredentialId,
        scopeType: "model_provider_credential",
        sessionId: null,
      },
      ...(input.credentialSource === "platform"
        ? [
          {
            agentId: null,
            modelCredentialSource: null,
            modelProviderCredentialId: null,
            period: "total" as const,
            periodStart: this.resolveTotalPeriodStart(),
            platformModelProviderCredentialId: null,
            scopeType: "managed_model_provider_credential" as const,
            sessionId: null,
          },
          {
            agentId: null,
            modelCredentialSource: null,
            modelProviderCredentialId: null,
            period: "day" as const,
            periodStart: dayPeriodStart,
            platformModelProviderCredentialId: null,
            scopeType: "managed_model_provider_credential" as const,
            sessionId: null,
          },
          {
            agentId: null,
            modelCredentialSource: null,
            modelProviderCredentialId: null,
            period: "month" as const,
            periodStart: monthPeriodStart,
            platformModelProviderCredentialId: null,
            scopeType: "managed_model_provider_credential" as const,
            sessionId: null,
          },
        ]
        : []),
      {
        agentId: null,
        modelCredentialSource: null,
        modelProviderCredentialId: null,
        period: "total",
        periodStart: this.resolveTotalPeriodStart(),
        platformModelProviderCredentialId: null,
        scopeType: "company",
        sessionId: null,
      },
      {
        agentId: null,
        modelCredentialSource: null,
        modelProviderCredentialId: null,
        period: "day",
        periodStart: dayPeriodStart,
        platformModelProviderCredentialId: null,
        scopeType: "company",
        sessionId: null,
      },
      {
        agentId: null,
        modelCredentialSource: null,
        modelProviderCredentialId: null,
        period: "month",
        periodStart: monthPeriodStart,
        platformModelProviderCredentialId: null,
        scopeType: "company",
        sessionId: null,
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
      if (aggregateRecord.modelCredentialSource === "platform") {
        return {
          target: [
            llmUsageAggregates.companyId,
            llmUsageAggregates.modelCredentialSource,
            llmUsageAggregates.platformModelProviderCredentialId,
            llmUsageAggregates.period,
            llmUsageAggregates.periodStart,
          ],
          targetWhere: sql`${llmUsageAggregates.scopeType} = 'model_provider_credential' AND ${llmUsageAggregates.modelCredentialSource} = 'platform'`,
        };
      }

      return {
        target: [
          llmUsageAggregates.companyId,
          llmUsageAggregates.modelCredentialSource,
          llmUsageAggregates.modelProviderCredentialId,
          llmUsageAggregates.period,
          llmUsageAggregates.periodStart,
        ],
        targetWhere: sql`${llmUsageAggregates.scopeType} = 'model_provider_credential' AND ${llmUsageAggregates.modelCredentialSource} = 'user_provided'`,
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
