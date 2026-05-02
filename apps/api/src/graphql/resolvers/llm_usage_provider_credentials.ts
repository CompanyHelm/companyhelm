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
type LlmUsageAggregateScopeType = "company" | "model_provider_credential" | "agent" | "session";

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
 * Presents provider credentials as a single usage-facing collection even though CompanyHelm stores
 * company-owned credentials and operator-managed credentials in different tables. The resolver only
 * selects non-secret platform fields and pairs each credential with the authenticated company's
 * total aggregate so the web app does not need to understand backend credential storage boundaries.
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
          eq(llmUsageAggregates.scopeType, "model_provider_credential"),
          eq(llmUsageAggregates.period, "total"),
        )) as LlmUsageAggregateRecord[];

      const platformCredentialIdsWithUsage = totals
        .filter((total) => total.modelCredentialSource === "platform" && total.platformModelProviderCredentialId)
        .map((total) => total.platformModelProviderCredentialId as string);
      const platformCredentials = await this.loadPlatformCredentials(tx, platformCredentialIdsWithUsage);

      const totalByProviderKey = new Map(
        totals.map((total) => [this.createProviderKey(total), total]),
      );
      const rows = [
        ...userCredentials.map((credential) =>
          this.serializeRow(companyId, "user_provided", credential, totalByProviderKey)
        ),
        ...platformCredentials.map((credential) =>
          this.serializeRow(companyId, "platform", credential, totalByProviderKey)
        ),
      ];

      return rows.sort((left, right) => {
        return this.resolveCombinedCostNanoUsd(right.total) - this.resolveCombinedCostNanoUsd(left.total);
      });
    });
  };

  private async loadPlatformCredentials(tx: unknown, idsWithUsage: string[]): Promise<CredentialRecord[]> {
    await PlatformAdminAccess.enable(tx as never);
    const platformTx = tx as {
      select(selection: Record<string, unknown>): {
        from(table: unknown): {
          where(condition: unknown): Promise<CredentialRecord[]>;
        };
      };
    };
    const activeCredentials = await platformTx
      .select({
        baseUrl: platformModelProviderCredentials.baseUrl,
        id: platformModelProviderCredentials.id,
        modelProvider: platformModelProviderCredentials.modelProvider,
        name: platformModelProviderCredentials.name,
        status: platformModelProviderCredentials.status,
        type: platformModelProviderCredentials.type,
      })
      .from(platformModelProviderCredentials)
      .where(eq(platformModelProviderCredentials.status, "active"));

    if (idsWithUsage.length === 0) {
      return activeCredentials;
    }

    const missingCredentialIds = idsWithUsage.filter((credentialId) =>
      !activeCredentials.some((credential) => credential.id === credentialId)
    );
    if (missingCredentialIds.length === 0) {
      return activeCredentials;
    }

    const inactiveCredentialsWithUsage = await platformTx
      .select({
        baseUrl: platformModelProviderCredentials.baseUrl,
        id: platformModelProviderCredentials.id,
        modelProvider: platformModelProviderCredentials.modelProvider,
        name: platformModelProviderCredentials.name,
        status: platformModelProviderCredentials.status,
        type: platformModelProviderCredentials.type,
      })
      .from(platformModelProviderCredentials)
      .where(inArray(platformModelProviderCredentials.id, missingCredentialIds));

    return [...activeCredentials, ...inactiveCredentialsWithUsage];
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
    if (total.modelCredentialSource === "platform") {
      return `platform:${total.platformModelProviderCredentialId ?? ""}`;
    }

    return `user_provided:${total.modelProviderCredentialId ?? ""}`;
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
