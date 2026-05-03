import { and, eq, gte, type SQL } from "drizzle-orm";
import { injectable } from "inversify";
import { llmUsageAggregates } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type LlmUsageAggregateScopeType =
  | "company"
  | "model_provider_credential"
  | "agent"
  | "session";
type LlmUsageAggregatePeriod = "total" | "day" | "month";

type LlmUsageAggregatesInput = {
  agentId?: string | null;
  modelProviderCredentialId?: string | null;
  period?: LlmUsageAggregatePeriod | null;
  periodStartAfter?: string | null;
  sessionId?: string | null;
  scopeType: LlmUsageAggregateScopeType;
};

type LlmUsageAggregatesArguments = {
  input: LlmUsageAggregatesInput;
};

type LlmUsageAggregateRecord = {
  cacheReadCostNanoUsd: number;
  cacheReadTokens: number;
  cacheWriteCostNanoUsd: number;
  cacheWriteTokens: number;
  companyId: string;
  createdAt: Date;
  id: string;
  inputCostNanoUsd: number;
  inputTokens: number;
  outputCostNanoUsd: number;
  outputTokens: number;
  period: LlmUsageAggregatePeriod;
  periodStart: Date;
  requestCount: number;
  agentId: string | null;
  modelProviderCredentialId: string | null;
  sessionId: string | null;
  scopeType: LlmUsageAggregateScopeType;
  totalCostNanoUsd: number;
  totalTokens: number;
  updatedAt: Date;
};

type GraphqlLlmUsageAggregateRecord = Omit<LlmUsageAggregateRecord, "createdAt" | "periodStart" | "updatedAt"> & {
  createdAt: string;
  periodStart: string;
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
 * Reads OSS LLM usage aggregates. It keeps operational usage visibility by company, credential,
 * agent, and session while excluding Cloud wallet, plan, virtual-spend, and managed-provider
 * accounting.
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
      this.appendScopeConditions(conditions, input);

      if (input.period) {
        conditions.push(eq(llmUsageAggregates.period, input.period));
      }
      if (periodStartAfter) {
        conditions.push(gte(llmUsageAggregates.periodStart, periodStartAfter));
      }

      const rows = await selectableDatabase
        .select({
          cacheReadCostNanoUsd: llmUsageAggregates.cacheReadCostNanoUsd,
          cacheReadTokens: llmUsageAggregates.cacheReadTokens,
          cacheWriteCostNanoUsd: llmUsageAggregates.cacheWriteCostNanoUsd,
          cacheWriteTokens: llmUsageAggregates.cacheWriteTokens,
          companyId: llmUsageAggregates.companyId,
          createdAt: llmUsageAggregates.createdAt,
          id: llmUsageAggregates.id,
          inputCostNanoUsd: llmUsageAggregates.inputCostNanoUsd,
          inputTokens: llmUsageAggregates.inputTokens,
          outputCostNanoUsd: llmUsageAggregates.outputCostNanoUsd,
          outputTokens: llmUsageAggregates.outputTokens,
          period: llmUsageAggregates.period,
          periodStart: llmUsageAggregates.periodStart,
          requestCount: llmUsageAggregates.requestCount,
          agentId: llmUsageAggregates.agentId,
          modelProviderCredentialId: llmUsageAggregates.modelProviderCredentialId,
          sessionId: llmUsageAggregates.sessionId,
          scopeType: llmUsageAggregates.scopeType,
          totalCostNanoUsd: llmUsageAggregates.totalCostNanoUsd,
          totalTokens: llmUsageAggregates.totalTokens,
          updatedAt: llmUsageAggregates.updatedAt,
        })
        .from(llmUsageAggregates)
        .where(and(...conditions));

      return [...rows]
        .sort(LlmUsageAggregatesQueryResolver.compareRecords)
        .map((record) => this.serializeRecord(record));
    });
  };

  private appendScopeConditions(
    conditions: SQL[],
    input: LlmUsageAggregatesInput,
  ): void {
    if (input.scopeType === "model_provider_credential") {
      if (input.modelProviderCredentialId) {
        conditions.push(eq(llmUsageAggregates.modelProviderCredentialId, input.modelProviderCredentialId));
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

  private serializeRecord(record: LlmUsageAggregateRecord): GraphqlLlmUsageAggregateRecord {
    return {
      ...record,
      createdAt: record.createdAt.toISOString(),
      periodStart: record.periodStart.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
