import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import {
  llmUsageAggregates,
  modelProviderCredentials,
} from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type LlmUsageAggregatePeriod = "total" | "day" | "month";
type LlmUsageAggregateScopeType =
  | "company"
  | "model_provider_credential"
  | "agent"
  | "session";

type CredentialRecord = {
  baseUrl: string | null;
  id: string;
  modelProvider: string;
  name: string;
  status: string;
  type: string;
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

type GraphqlLlmUsageProviderCredentialRecord = {
  baseUrl: string | null;
  credentialId: string;
  id: string;
  modelProvider: string;
  name: string;
  status: string;
  total: GraphqlLlmUsageAggregateRecord;
  type: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Presents user-provided provider credentials as usage-facing rows. OSS self-hosting has no
 * CompanyHelm-managed provider bucket, so totals are keyed directly by company credential.
 */
@injectable()
export class LlmUsageProviderCredentialsQueryResolver {
  execute = async (
    _root: unknown,
    _arguments: unknown,
    context: GraphqlRequestContext,
  ): Promise<GraphqlLlmUsageProviderCredentialRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const companyId = context.authSession.company.id;
    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const userCredentials = await selectableDatabase
        .select({
          baseUrl: modelProviderCredentials.baseUrl,
          id: modelProviderCredentials.id,
          modelProvider: modelProviderCredentials.modelProvider,
          name: modelProviderCredentials.name,
          status: modelProviderCredentials.status,
          type: modelProviderCredentials.type,
        })
        .from(modelProviderCredentials)
        .where(eq(modelProviderCredentials.companyId, companyId)) as CredentialRecord[];

      const totals = await selectableDatabase
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
        .where(and(
          eq(llmUsageAggregates.companyId, companyId),
          inArray(llmUsageAggregates.scopeType, ["model_provider_credential"]),
          eq(llmUsageAggregates.period, "total"),
        )) as LlmUsageAggregateRecord[];

      const totalByCredentialId = new Map(
        totals.map((total) => [total.modelProviderCredentialId ?? "", total]),
      );
      const rows = userCredentials.map((credential) =>
        this.serializeRow(companyId, credential, totalByCredentialId)
      );

      return rows.sort((left, right) => right.total.totalCostNanoUsd - left.total.totalCostNanoUsd);
    });
  };

  private serializeRow(
    companyId: string,
    credential: CredentialRecord,
    totalByCredentialId: Map<string, LlmUsageAggregateRecord>,
  ): GraphqlLlmUsageProviderCredentialRecord {
    const total = totalByCredentialId.get(credential.id)
      ?? this.createEmptyAggregate(companyId, credential.id);

    return {
      baseUrl: credential.baseUrl,
      credentialId: credential.id,
      id: credential.id,
      modelProvider: credential.modelProvider,
      name: credential.name,
      status: credential.status,
      total: this.serializeAggregate(total),
      type: credential.type,
    };
  }

  private createEmptyAggregate(
    companyId: string,
    credentialId: string,
  ): LlmUsageAggregateRecord {
    const epoch = new Date(0);
    return {
      cacheReadCostNanoUsd: 0,
      cacheReadTokens: 0,
      cacheWriteCostNanoUsd: 0,
      cacheWriteTokens: 0,
      companyId,
      createdAt: epoch,
      id: `empty:${credentialId}`,
      inputCostNanoUsd: 0,
      inputTokens: 0,
      outputCostNanoUsd: 0,
      outputTokens: 0,
      period: "total",
      periodStart: epoch,
      requestCount: 0,
      agentId: null,
      modelProviderCredentialId: credentialId,
      sessionId: null,
      scopeType: "model_provider_credential",
      totalCostNanoUsd: 0,
      totalTokens: 0,
      updatedAt: epoch,
    };
  }

  private serializeAggregate(record: LlmUsageAggregateRecord): GraphqlLlmUsageAggregateRecord {
    return {
      ...record,
      createdAt: record.createdAt.toISOString(),
      periodStart: record.periodStart.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
