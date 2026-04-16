import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agentSessions,
  agents,
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../../db/schema.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.js";
import type { ModelProviderId } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteModelProviderCredentialMutationArguments = {
  input: {
    id: string;
    replacementCredentialId?: string | null;
  };
};

type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: ModelProviderId;
  isDefault: boolean;
  type: "api_key" | "oauth_token";
  status: "active" | "error";
  errorMessage: string | null;
  refreshToken: string | null;
  refreshedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: ModelProviderId;
  type: "api_key" | "oauth_token";
  status: "active" | "error";
  errorMessage: string | null;
  refreshToken: string | null;
  refreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ModelProviderCredentialModelRecord = {
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  reasoningLevels: string[] | null;
};

type AgentUsageRecord = {
  id: string;
  name: string;
  defaultReasoningLevel: string | null;
};

type SessionUsageRecord = {
  id: string;
  currentReasoningLevel: string;
};

type CredentialUsageRecord = {
  agentRecords: AgentUsageRecord[];
  credentialModelIds: string[];
  sessionRecords: SessionUsageRecord[];
};

type ReplacementTargetRecord = {
  credential: ModelProviderCredentialRecord;
  model: ModelProviderCredentialModelRecord;
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): {
      returning?(selection?: Record<string, unknown>): Promise<ModelProviderCredentialRecord[]>;
    };
  };
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<void>;
    };
  };
};

const AGENT_CREATE_PROVIDER_OPTION_ID_PREFIX = "agent-create-provider-option:";

/**
 * Deletes one company-scoped model credential only after ensuring no agent defaults or persisted
 * sessions would be left pointing at deleted model rows. When a replacement credential is
 * supplied, the mutation migrates those references first so the delete remains safe.
 */
@injectable()
export class DeleteModelProviderCredentialMutation extends Mutation<
  DeleteModelProviderCredentialMutationArguments,
  GraphqlModelProviderCredentialRecord
> {
  private readonly modelRegistry: ModelRegistry;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry()) {
    super();
    this.modelRegistry = modelRegistry;
  }

  protected resolve = async (
    arguments_: DeleteModelProviderCredentialMutationArguments,
    context: GraphqlRequestContext,
  ) => {
    const credentialId = String(arguments_.input.id || "").trim();
    const replacementCredentialId = String(arguments_.input.replacementCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("id is required.");
    }
    this.assertCredentialId(credentialId, "id");
    if (replacementCredentialId.length > 0) {
      this.assertCredentialId(replacementCredentialId, "replacementCredentialId");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const companyId = context.authSession.company.id;
    const [credential] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const existingCredential = await this.loadCredentialRecord(selectableDatabase, companyId, credentialId);
      if (!existingCredential) {
        throw new Error("Credential not found.");
      }

      const credentialUsage = await this.findCredentialUsage(selectableDatabase, companyId, credentialId);
      if (credentialUsage && replacementCredentialId.length === 0) {
        throw new Error(this.buildInUseErrorMessage(credentialUsage));
      }
      if (credentialUsage && replacementCredentialId.length > 0) {
        if (replacementCredentialId === credentialId) {
          throw new Error("replacementCredentialId must reference a different credential.");
        }

        const replacementTarget = await this.loadReplacementTarget(
          selectableDatabase,
          companyId,
          replacementCredentialId,
        );
        await this.reassignCredentialUsage(
          updatableDatabase,
          companyId,
          credentialUsage,
          replacementTarget,
        );
      }

      const deletedCredentials = await deletableDatabase
        .delete(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, credentialId),
        ))
        .returning?.({
          id: modelProviderCredentials.id,
          companyId: modelProviderCredentials.companyId,
          isDefault: modelProviderCredentials.isDefault,
          name: modelProviderCredentials.name,
          modelProvider: modelProviderCredentials.modelProvider,
          type: modelProviderCredentials.type,
          status: modelProviderCredentials.status,
          errorMessage: modelProviderCredentials.errorMessage,
          refreshToken: modelProviderCredentials.refreshToken,
          refreshedAt: modelProviderCredentials.refreshedAt,
          createdAt: modelProviderCredentials.createdAt,
          updatedAt: modelProviderCredentials.updatedAt,
        }) as Promise<ModelProviderCredentialRecord[]>;
      const deletedCredential = deletedCredentials[0];
      if (existingCredential.isDefault) {
        const remainingCredentials = await selectableDatabase
          .select({
            id: modelProviderCredentials.id,
            companyId: modelProviderCredentials.companyId,
            isDefault: modelProviderCredentials.isDefault,
            name: modelProviderCredentials.name,
            modelProvider: modelProviderCredentials.modelProvider,
            type: modelProviderCredentials.type,
            status: modelProviderCredentials.status,
            errorMessage: modelProviderCredentials.errorMessage,
            refreshToken: modelProviderCredentials.refreshToken,
            refreshedAt: modelProviderCredentials.refreshedAt,
            createdAt: modelProviderCredentials.createdAt,
            updatedAt: modelProviderCredentials.updatedAt,
          })
          .from(modelProviderCredentials)
          .where(eq(modelProviderCredentials.companyId, companyId)) as ModelProviderCredentialRecord[];
        const fallbackCredential = [...remainingCredentials]
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
          .at(0);
        if (fallbackCredential) {
          await updatableDatabase
            .update(modelProviderCredentials)
            .set({
              isDefault: false,
            })
            .where(eq(modelProviderCredentials.companyId, companyId));
          await updatableDatabase
            .update(modelProviderCredentials)
            .set({
              isDefault: true,
            })
            .where(and(
              eq(modelProviderCredentials.companyId, companyId),
              eq(modelProviderCredentials.id, fallbackCredential.id),
            ));
        }
      }

      return deletedCredential ? [deletedCredential] : [];
    });

    if (!credential) {
      throw new Error("Credential not found.");
    }

    return {
      ...credential,
      refreshedAt: credential.refreshedAt?.toISOString() ?? null,
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
    };
  };

  private assertCredentialId(credentialId: string, fieldName: string): void {
    if (credentialId.startsWith(AGENT_CREATE_PROVIDER_OPTION_ID_PREFIX)) {
      throw new Error(`${fieldName} must be a model provider credential id, not an agent create provider option id.`);
    }
  }

  private async findCredentialUsage(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    credentialId: string,
  ): Promise<CredentialUsageRecord | null> {
    const credentialModelRecords = await this.loadCredentialModelRecords(selectableDatabase, companyId, credentialId);
    if (credentialModelRecords.length === 0) {
      return null;
    }

    const credentialModelIds = credentialModelRecords.map((credentialModelRecord) => credentialModelRecord.id);
    const agentRecords = await selectableDatabase
      .select({
        id: agents.id,
        name: agents.name,
        defaultReasoningLevel: agents.default_reasoning_level,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        inArray(agents.defaultModelProviderCredentialModelId, credentialModelIds),
      )) as AgentUsageRecord[];
    const sessionRecords = await selectableDatabase
      .select({
        id: agentSessions.id,
        currentReasoningLevel: agentSessions.currentReasoningLevel,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        inArray(agentSessions.currentModelProviderCredentialModelId, credentialModelIds),
      )) as SessionUsageRecord[];
    if (agentRecords.length === 0 && sessionRecords.length === 0) {
      return null;
    }

    return {
      agentRecords: [...agentRecords].sort((left, right) => left.name.localeCompare(right.name)),
      credentialModelIds,
      sessionRecords,
    };
  }

  private buildInUseErrorMessage(credentialUsage: CredentialUsageRecord): string {
    const usageParts: string[] = [];
    const agentNames = credentialUsage.agentRecords.map((agentRecord) => agentRecord.name);
    if (agentNames.length > 0) {
      usageParts.push(
        agentNames.length === 1
          ? `agent ${agentNames[0]}`
          : `agents ${agentNames.join(", ")}`,
      );
    }
    if (credentialUsage.sessionRecords.length > 0) {
      usageParts.push(
        credentialUsage.sessionRecords.length === 1
          ? "1 existing session"
          : `${credentialUsage.sessionRecords.length} existing sessions`,
      );
    }

    return `This credential is still used by ${usageParts.join(" and ")}. Select a replacement credential before deleting it.`;
  }

  private async loadCredentialModelRecords(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    credentialId: string,
  ): Promise<ModelProviderCredentialModelRecord[]> {
    return selectableDatabase
      .select({
        id: modelProviderCredentialModels.id,
        isDefault: modelProviderCredentialModels.isDefault,
        modelId: modelProviderCredentialModels.modelId,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
      )) as Promise<ModelProviderCredentialModelRecord[]>;
  }

  private async loadCredentialRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    credentialId: string,
  ): Promise<ModelProviderCredentialRecord | null> {
    const [credentialRecord] = await selectableDatabase
      .select({
        id: modelProviderCredentials.id,
        companyId: modelProviderCredentials.companyId,
        isDefault: modelProviderCredentials.isDefault,
        name: modelProviderCredentials.name,
        modelProvider: modelProviderCredentials.modelProvider,
        type: modelProviderCredentials.type,
        status: modelProviderCredentials.status,
        errorMessage: modelProviderCredentials.errorMessage,
        refreshToken: modelProviderCredentials.refreshToken,
        refreshedAt: modelProviderCredentials.refreshedAt,
        createdAt: modelProviderCredentials.createdAt,
        updatedAt: modelProviderCredentials.updatedAt,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.id, credentialId),
      )) as ModelProviderCredentialRecord[];

    return credentialRecord ?? null;
  }

  private async loadReplacementTarget(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    replacementCredentialId: string,
  ): Promise<ReplacementTargetRecord> {
    const replacementCredential = await this.loadCredentialRecord(
      selectableDatabase,
      companyId,
      replacementCredentialId,
    );
    if (!replacementCredential) {
      throw new Error("Replacement credential not found.");
    }

    const replacementModelRecords = await this.loadCredentialModelRecords(
      selectableDatabase,
      companyId,
      replacementCredentialId,
    );
    const replacementModel = replacementModelRecords.find((replacementModelRecord) => replacementModelRecord.isDefault)
      ?? replacementModelRecords.find((replacementModelRecord) =>
        replacementModelRecord.modelId === this.modelRegistry.getDefaultModelForProvider(
          replacementCredential.modelProvider,
        )
      )
      ?? replacementModelRecords[0]
      ?? null;
    if (!replacementModel) {
      throw new Error("Replacement credential does not have any available models.");
    }

    return {
      credential: replacementCredential,
      model: replacementModel,
    };
  }

  private async reassignCredentialUsage(
    updatableDatabase: UpdatableDatabase,
    companyId: string,
    credentialUsage: CredentialUsageRecord,
    replacementTarget: ReplacementTargetRecord,
  ): Promise<void> {
    const now = new Date();
    for (const agentRecord of credentialUsage.agentRecords) {
      await updatableDatabase
        .update(agents)
        .set({
          defaultModelProviderCredentialModelId: replacementTarget.model.id,
          default_reasoning_level: this.resolveAgentReasoningLevel(
            replacementTarget.credential.modelProvider,
            replacementTarget.model.reasoningLevels,
            agentRecord.defaultReasoningLevel,
          ),
          updated_at: now,
        })
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.id, agentRecord.id),
          inArray(agents.defaultModelProviderCredentialModelId, credentialUsage.credentialModelIds),
        ));
    }
    for (const sessionRecord of credentialUsage.sessionRecords) {
      await updatableDatabase
        .update(agentSessions)
        .set({
          currentModelProviderCredentialModelId: replacementTarget.model.id,
          currentReasoningLevel: this.resolveSessionReasoningLevel(
            replacementTarget.credential.modelProvider,
            replacementTarget.model.reasoningLevels,
            sessionRecord.currentReasoningLevel,
          ),
          updated_at: now,
        })
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionRecord.id),
          inArray(agentSessions.currentModelProviderCredentialModelId, credentialUsage.credentialModelIds),
        ));
    }
  }

  private resolveAgentReasoningLevel(
    modelProvider: ModelProviderId,
    supportedLevels: string[] | null,
    currentReasoningLevel: string | null,
  ): string | null {
    const availableLevels = supportedLevels?.filter((supportedLevel) => supportedLevel.length > 0) ?? [];
    if (availableLevels.length === 0) {
      return null;
    }
    if (currentReasoningLevel && availableLevels.includes(currentReasoningLevel)) {
      return currentReasoningLevel;
    }

    const providerDefaultReasoningLevel = this.modelRegistry.getDefaultReasoningLevelForProvider(modelProvider);
    if (providerDefaultReasoningLevel && availableLevels.includes(providerDefaultReasoningLevel)) {
      return providerDefaultReasoningLevel;
    }

    return availableLevels[0] ?? null;
  }

  private resolveSessionReasoningLevel(
    modelProvider: ModelProviderId,
    supportedLevels: string[] | null,
    currentReasoningLevel: string,
  ): string {
    const availableLevels = supportedLevels?.filter((supportedLevel) => supportedLevel.length > 0) ?? [];
    if (availableLevels.length === 0) {
      return "";
    }
    if (currentReasoningLevel.length > 0 && availableLevels.includes(currentReasoningLevel)) {
      return currentReasoningLevel;
    }

    const providerDefaultReasoningLevel = this.modelRegistry.getDefaultReasoningLevelForProvider(modelProvider);
    if (providerDefaultReasoningLevel && availableLevels.includes(providerDefaultReasoningLevel)) {
      return providerDefaultReasoningLevel;
    }

    return availableLevels[0] ?? "";
  }
}
