import { and, eq, gte, type SQL } from "drizzle-orm";
import { injectable } from "inversify";
import { llmUsageAggregates } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type LlmUsageAggregateScopeType =
  | "company"
  | "managed_model_provider_credential"
  | "model_provider_credential"
  | "agent"
  | "session";
type LlmUsageAggregatePeriod = "total" | "day" | "month";
type LlmUsageModelCredentialSource = "platform" | "user_provided";

type LlmUsageAggregatesInput = {
  agentId?: string | null;
  modelCredentialSource?: LlmUsageModelCredentialSource | null;
  modelProviderCredentialId?: string | null;
  period?: LlmUsageAggregatePeriod | null;
  periodStartAfter?: string | null;
  platformModelProviderCredentialId?: string | null;
  sessionId?: string | null;
  scopeType: LlmUsageAggregateScopeType;
};

type LlmUsageAggregatesArguments = {
  input: LlmUsageAggregatesInput;
};

type LlmUsageAggregateRecord = {
  cacheReadCostNanoUsd: number;
  cacheReadCostNanoVirtualUsd: number;
  cacheReadTokens: number;
  cacheWriteCostNanoUsd: number;
  cacheWriteCostNanoVirtualUsd: number;
  cacheWriteTokens: number;
  companyId: string;
  createdAt: Date;
  id: string;
  inputCostNanoUsd: number;
  inputCostNanoVirtualUsd: number;
  inputTokens: number;
  outputCostNanoUsd: number;
  outputCostNanoVirtualUsd: number;
  outputTokens: number;
  period: LlmUsageAggregatePeriod;
  periodStart: Date;
  requestCount: number;
  agentId: string | null;
  modelCredentialSource: LlmUsageModelCredentialSource | null;
  modelProviderCredentialId: string | null;
  platformModelProviderCredentialId: string | null;
  sessionId: string | null;
  scopeType: LlmUsageAggregateScopeType;
  totalCostNanoUsd: number;
  totalCostNanoVirtualUsd: number;
  totalTokens: number;
  updatedAt: Date;
};

type GraphqlLlmUsageAggregateRecord = {
  cacheReadCostNanoUsd: number;
  cacheReadCostNanoVirtualUsd: number;
  cacheReadTokens: number;
  cacheWriteCostNanoUsd: number;
  cacheWriteCostNanoVirtualUsd: number;
  cacheWriteTokens: number;
  companyId: string;
  createdAt: string;
  id: string;
  inputCostNanoUsd: number;
  inputCostNanoVirtualUsd: number;
  inputTokens: number;
  outputCostNanoUsd: number;
  outputCostNanoVirtualUsd: number;
  outputTokens: number;
  period: LlmUsageAggregatePeriod;
  periodStart: string;
  requestCount: number;
  agentId: string | null;
  modelCredentialSource: LlmUsageModelCredentialSource | null;
  modelProviderCredentialId: string | null;
  platformModelProviderCredentialId: string | null;
  sessionId: string | null;
  scopeType: LlmUsageAggregateScopeType;
  totalCostNanoUsd: number;
  totalCostNanoVirtualUsd: number;
  totalTokens: number;
  updatedAt: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<LlmUsageAggregateRecord[]>;
    };
  };
};

/**
 * Reads pre-aggregated LLM usage rows for the authenticated company. The resolver deliberately
 * returns the stored aggregate shape instead of calculating rollups on demand so charts and quota
 * surfaces stay cheap as usage grows.
 */
@injectable()
export class LlmUsageAggregatesQueryResolver {
  execute = async (
    _root: unknown,
    arguments_: LlmUsageAggregatesArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlLlmUsageAggregateRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const companyId = context.authSession.company.id;
    const input = arguments_.input;
    const periodStartAfter = this.resolvePeriodStartAfter(input.periodStartAfter);

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const conditions: SQL[] = [
        eq(llmUsageAggregates.companyId, companyId),
        eq(llmUsageAggregates.scopeType, input.scopeType),
      ];
      this.appendScopeConditions(conditions, input, context.isPlatformAdmin === true);

      if (input.period) {
        conditions.push(eq(llmUsageAggregates.period, input.period));
      }
      if (periodStartAfter) {
        conditions.push(gte(llmUsageAggregates.periodStart, periodStartAfter));
      }

      const rows = await selectableDatabase
        .select({
          cacheReadCostNanoUsd: llmUsageAggregates.cacheReadCostNanoUsd,
          cacheReadCostNanoVirtualUsd: llmUsageAggregates.cacheReadCostNanoVirtualUsd,
          cacheReadTokens: llmUsageAggregates.cacheReadTokens,
          cacheWriteCostNanoUsd: llmUsageAggregates.cacheWriteCostNanoUsd,
          cacheWriteCostNanoVirtualUsd: llmUsageAggregates.cacheWriteCostNanoVirtualUsd,
          cacheWriteTokens: llmUsageAggregates.cacheWriteTokens,
          companyId: llmUsageAggregates.companyId,
          createdAt: llmUsageAggregates.createdAt,
          id: llmUsageAggregates.id,
          inputCostNanoUsd: llmUsageAggregates.inputCostNanoUsd,
          inputCostNanoVirtualUsd: llmUsageAggregates.inputCostNanoVirtualUsd,
          inputTokens: llmUsageAggregates.inputTokens,
          outputCostNanoUsd: llmUsageAggregates.outputCostNanoUsd,
          outputCostNanoVirtualUsd: llmUsageAggregates.outputCostNanoVirtualUsd,
          outputTokens: llmUsageAggregates.outputTokens,
          period: llmUsageAggregates.period,
          periodStart: llmUsageAggregates.periodStart,
          requestCount: llmUsageAggregates.requestCount,
          agentId: llmUsageAggregates.agentId,
          modelCredentialSource: llmUsageAggregates.modelCredentialSource,
          modelProviderCredentialId: llmUsageAggregates.modelProviderCredentialId,
          platformModelProviderCredentialId: llmUsageAggregates.platformModelProviderCredentialId,
          sessionId: llmUsageAggregates.sessionId,
          scopeType: llmUsageAggregates.scopeType,
          totalCostNanoUsd: llmUsageAggregates.totalCostNanoUsd,
          totalCostNanoVirtualUsd: llmUsageAggregates.totalCostNanoVirtualUsd,
          totalTokens: llmUsageAggregates.totalTokens,
          updatedAt: llmUsageAggregates.updatedAt,
        })
        .from(llmUsageAggregates)
        .where(and(...conditions));

      return [...rows]
        .sort(LlmUsageAggregatesQueryResolver.compareRecords)
        .map((record) => this.serializeRecord(record, context.isPlatformAdmin === true));
    });
  };

  private appendScopeConditions(
    conditions: SQL[],
    input: LlmUsageAggregatesInput,
    isPlatformAdmin: boolean,
  ): void {
    if (input.scopeType === "model_provider_credential") {
      if (input.modelCredentialSource) {
        conditions.push(eq(llmUsageAggregates.modelCredentialSource, input.modelCredentialSource));
      }
      if (input.modelProviderCredentialId) {
        conditions.push(eq(llmUsageAggregates.modelProviderCredentialId, input.modelProviderCredentialId));
      }
      if (input.platformModelProviderCredentialId) {
        if (!isPlatformAdmin) {
          throw new Error("Platform model provider credential filters require platform admin access.");
        }

        conditions.push(eq(
          llmUsageAggregates.platformModelProviderCredentialId,
          input.platformModelProviderCredentialId,
        ));
      }
      return;
    }

    if (input.scopeType === "agent") {
      if (!input.agentId) {
        throw new Error("agentId is required for agent usage.");
      }

      conditions.push(eq(llmUsageAggregates.agentId, input.agentId));
      return;
    }

    if (input.scopeType === "session") {
      if (!input.sessionId) {
        throw new Error("sessionId is required for session usage.");
      }

      conditions.push(eq(llmUsageAggregates.sessionId, input.sessionId));
    }
  }

  private resolvePeriodStartAfter(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error("periodStartAfter must be an ISO date string.");
    }

    return parsedDate;
  }

  private static compareRecords(left: LlmUsageAggregateRecord, right: LlmUsageAggregateRecord): number {
    const periodComparison = left.period.localeCompare(right.period);
    if (periodComparison !== 0) {
      return periodComparison;
    }

    return left.periodStart.getTime() - right.periodStart.getTime();
  }

  private serializeRecord(
    record: LlmUsageAggregateRecord,
    canReadPlatformModelProviderCredentialId: boolean,
  ): GraphqlLlmUsageAggregateRecord {
    return {
      ...record,
      createdAt: record.createdAt.toISOString(),
      periodStart: record.periodStart.toISOString(),
      platformModelProviderCredentialId: canReadPlatformModelProviderCredentialId
        ? record.platformModelProviderCredentialId
        : null,
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
