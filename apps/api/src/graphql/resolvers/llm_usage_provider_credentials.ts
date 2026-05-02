import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import {
  llmUsageAggregates,
  modelProviderCredentials,
  platformModelProviderCredentials,
  type modelCredentialSourceEnum,
} from "../../db/schema.ts";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type ModelCredentialSource = typeof modelCredentialSourceEnum.enumValues[number];
type LlmUsageAggregatePeriod = "total" | "day" | "month";
type LlmUsageAggregateScopeType =
  | "company"
  | "managed_model_provider_credential"
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
  modelCredentialSource: ModelCredentialSource | null;
  modelProviderCredentialId: string | null;
  platformModelProviderCredentialId: string | null;
  sessionId: string | null;
  scopeType: LlmUsageAggregateScopeType;
  totalCostNanoUsd: number;
  totalCostNanoVirtualUsd: number;
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
  modelCredentialSource: ModelCredentialSource;
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
 * Presents provider credentials as a usage-facing collection. Operator-managed credentials remain
 * internal implementation detail: companies see one CompanyHelm managed credential whose usage is
 * backed by the combined managed aggregate, while user-provided credentials stay itemized.
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
        .where(and(
          eq(llmUsageAggregates.companyId, companyId),
          inArray(llmUsageAggregates.scopeType, [
            "managed_model_provider_credential",
            "model_provider_credential",
          ]),
          eq(llmUsageAggregates.period, "total"),
        )) as LlmUsageAggregateRecord[];

      const totalByProviderKey = new Map(
        totals.map((total) => [this.createProviderKey(total), total]),
      );
      const managedTotal = totals.find((total) => total.scopeType === "managed_model_provider_credential");
      const hasManagedCredentials = await this.hasManagedCredentials(tx);
      const managedRows = hasManagedCredentials || managedTotal
        ? [this.serializeManagedRow(companyId, managedTotal)]
        : [];
      const rows = [
        ...userCredentials.map((credential) =>
          this.serializeRow(companyId, "user_provided", credential, totalByProviderKey)
        ),
        ...managedRows,
      ];

      return rows.sort((left, right) => {
        return this.resolveCombinedCostNanoUsd(right.total) - this.resolveCombinedCostNanoUsd(left.total);
      });
    });
  };

  private async hasManagedCredentials(tx: unknown): Promise<boolean> {
    await PlatformAdminAccess.enable(tx as never);
    const platformTx = tx as {
      select(selection: Record<string, unknown>): {
        from(table: unknown): {
          where(condition: unknown): Promise<Array<{ id: string }>>;
        };
      };
    };
    const activeCredentials = await platformTx
      .select({
        id: platformModelProviderCredentials.id,
      })
      .from(platformModelProviderCredentials)
      .where(eq(platformModelProviderCredentials.status, "active"));

    return activeCredentials.length > 0;
  }

  private serializeRow(
    companyId: string,
    modelCredentialSource: ModelCredentialSource,
    credential: CredentialRecord,
    totalByProviderKey: Map<string, LlmUsageAggregateRecord>,
  ): GraphqlLlmUsageProviderCredentialRecord {
    const total = totalByProviderKey.get(`${modelCredentialSource}:${credential.id}`)
      ?? this.createEmptyAggregate(companyId, modelCredentialSource, credential.id);

    return {
      baseUrl: credential.baseUrl,
      credentialId: credential.id,
      id: `${modelCredentialSource}:${credential.id}`,
      modelCredentialSource,
      modelProvider: credential.modelProvider,
      name: modelCredentialSource === "platform" ? "CompanyHelm managed" : credential.name,
      status: credential.status,
      total: this.serializeAggregate(total),
      type: credential.type,
    };
  }

  private createProviderKey(total: LlmUsageAggregateRecord): string {
    if (total.scopeType === "managed_model_provider_credential") {
      return "platform:managed";
    }
    if (total.modelCredentialSource === "platform") {
      return `platform:${total.platformModelProviderCredentialId ?? ""}`;
    }

    return `user_provided:${total.modelProviderCredentialId ?? ""}`;
  }

  private serializeManagedRow(
    companyId: string,
    total: LlmUsageAggregateRecord | undefined,
  ): GraphqlLlmUsageProviderCredentialRecord {
    const managedTotal = total ?? this.createEmptyManagedAggregate(companyId);

    return {
      baseUrl: null,
      credentialId: "managed",
      id: "platform:managed",
      modelCredentialSource: "platform",
      modelProvider: "companyhelm",
      name: "CompanyHelm managed",
      status: "active",
      total: this.serializeAggregate(managedTotal),
      type: "api_key",
    };
  }

  private createEmptyAggregate(
    companyId: string,
    modelCredentialSource: ModelCredentialSource,
    credentialId: string,
  ): LlmUsageAggregateRecord {
    const epoch = new Date(0);
    return {
      cacheReadCostNanoUsd: 0,
      cacheReadCostNanoVirtualUsd: 0,
      cacheReadTokens: 0,
      cacheWriteCostNanoUsd: 0,
      cacheWriteCostNanoVirtualUsd: 0,
      cacheWriteTokens: 0,
      companyId,
      createdAt: epoch,
      id: `empty:${modelCredentialSource}:${credentialId}`,
      inputCostNanoUsd: 0,
      inputCostNanoVirtualUsd: 0,
      inputTokens: 0,
      outputCostNanoUsd: 0,
      outputCostNanoVirtualUsd: 0,
      outputTokens: 0,
      period: "total",
      periodStart: epoch,
      requestCount: 0,
      agentId: null,
      modelCredentialSource,
      modelProviderCredentialId: modelCredentialSource === "user_provided" ? credentialId : null,
      platformModelProviderCredentialId: modelCredentialSource === "platform" ? credentialId : null,
      sessionId: null,
      scopeType: "model_provider_credential",
      totalCostNanoUsd: 0,
      totalCostNanoVirtualUsd: 0,
      totalTokens: 0,
      updatedAt: epoch,
    };
  }

  private createEmptyManagedAggregate(companyId: string): LlmUsageAggregateRecord {
    const aggregate = this.createEmptyAggregate(companyId, "platform", "managed");

    return {
      ...aggregate,
      id: "empty:platform:managed",
      modelCredentialSource: null,
      platformModelProviderCredentialId: null,
      scopeType: "managed_model_provider_credential",
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

  private resolveCombinedCostNanoUsd(record: GraphqlLlmUsageAggregateRecord): number {
    return record.totalCostNanoUsd + record.totalCostNanoVirtualUsd;
  }
}
