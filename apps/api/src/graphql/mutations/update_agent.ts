import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agents,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../../db/schema.ts";
import type { ModelProviderId } from "../../services/ai_providers/model_provider_service.js";
import { ModelOptionSelection } from "../../services/ai_providers/model_option_selection.ts";
import type { AgentEnvironmentTemplate } from "../../services/environments/providers/provider_interface.ts";
import { AgentEnvironmentTemplateService } from "../../services/environments/template_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateAgentMutationArguments = {
  input: {
    autoCompactPercent?: number | null;
    defaultComputeProviderDefinitionId: string;
    defaultEnvironmentTemplateId: string;
    id: string;
    llmModelId: string;
    name: string;
    modelOptions?: unknown;
    title?: string | null;
    reasoningLevel?: string | null;
    systemPrompt?: string | null;
  };
};

type AgentRecord = {
  defaultAutoCompactPercent: number;
  id: string;
  name: string;
  title: string | null;
  defaultModelProviderCredentialModelId: string | null;
  defaultComputeProviderDefinitionId: string | null;
  defaultEnvironmentTemplateId: string;
  defaultReasoningLevel: string | null;
  defaultModelOptions: unknown;
  systemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ModelRecord = {
  id: string;
  modelProviderCredentialId: string;
  name: string;
  modelOptions: unknown;
  reasoningLevels: string[] | null;
};

type CredentialRecord = {
  id: string;
  modelProvider: ModelProviderId;
};

type ExistingAgentRecord = {
  defaultAutoCompactPercent: number;
  id: string;
};

type ComputeProviderDefinitionRecord = {
  id: string;
  name: string;
  provider: "e2b";
};

type GraphqlAgentRecord = {
  autoCompactPercent: number;
  defaultComputeProvider: "e2b" | null;
  defaultComputeProviderDefinitionId: string | null;
  defaultComputeProviderDefinitionName: string | null;
  defaultEnvironmentTemplateId: string;
  environmentTemplate: AgentEnvironmentTemplate;
  id: string;
  name: string;
  title: string | null;
  llmModelId: string | null;
  modelProviderCredentialId: string | null;
  modelProviderCredentialModelId: string | null;
  modelProvider: ModelProviderId | null;
  modelName: string | null;
  modelOptions: unknown;
  reasoningLevel: string | null;
  systemPrompt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DatabaseTransaction = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<AgentRecord[]>;
      };
    };
  };
  execute?(query: unknown): Promise<unknown>;
};

/**
 * Rewrites one persisted agent configuration after validating that the selected credential, model,
 * and reasoning level are compatible for the authenticated company.
 */
@injectable()
export class UpdateAgentMutation extends Mutation<UpdateAgentMutationArguments, GraphqlAgentRecord> {
  private readonly templateService: AgentEnvironmentTemplateService;

  constructor(
    @inject(AgentEnvironmentTemplateService)
    templateService: AgentEnvironmentTemplateService = {
      async resolveTemplateForProvider(
        _transactionProvider: unknown,
        input: { templateId: string },
      ) {
        return {
          computerUse: false,
          cpuCount: 4,
          diskSpaceGb: 10,
          memoryGb: 8,
          name: "Default",
          templateId: input.templateId,
        };
      },
    } as never,
  ) {
    super();
    this.templateService = templateService;
  }

  protected resolve = async (
    arguments_: UpdateAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlAgentRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.id.length === 0) {
      throw new Error("id is required.");
    }
    if (arguments_.input.name.length === 0) {
      throw new Error("name is required.");
    }
    if (arguments_.input.defaultComputeProviderDefinitionId.length === 0) {
      throw new Error("defaultComputeProviderDefinitionId is required.");
    }
    if (arguments_.input.defaultEnvironmentTemplateId.length === 0) {
      throw new Error("defaultEnvironmentTemplateId is required.");
    }
    const authSession = context.authSession;
    const runtimeTransactionProvider = context.app_runtime_transaction_provider;
    const companyId = authSession.company!.id;

    return runtimeTransactionProvider.transaction(async (tx) => {
      const databaseTransaction = tx as unknown as DatabaseTransaction;
      const transactionProvider = {
        async transaction<T>(transaction: (databaseTransaction: DatabaseTransaction) => Promise<T>): Promise<T> {
          return transaction(databaseTransaction);
        },
      };
      const [existingAgent] = await databaseTransaction
        .select({
          defaultAutoCompactPercent: agents.defaultAutoCompactPercent,
          id: agents.id,
        })
        .from(agents)
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.id, arguments_.input.id),
        )) as ExistingAgentRecord[];
      if (!existingAgent) {
        throw new Error("Agent not found.");
      }

      const { credentialRecord, modelRecord } = await this.loadModelSelection(
        databaseTransaction,
        companyId,
        arguments_.input,
      );

      const [computeProviderDefinitionRecord] = await databaseTransaction
        .select({
          id: computeProviderDefinitions.id,
          name: computeProviderDefinitions.name,
          provider: computeProviderDefinitions.provider,
        })
        .from(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, companyId),
          eq(computeProviderDefinitions.id, arguments_.input.defaultComputeProviderDefinitionId),
        )) as ComputeProviderDefinitionRecord[];
      if (!computeProviderDefinitionRecord) {
        throw new Error("Compute provider definition not found.");
      }
      const environmentTemplate = await this.templateService.resolveTemplateForProvider(
        transactionProvider as never,
        {
          companyId,
          providerDefinitionId: computeProviderDefinitionRecord.id,
          templateId: arguments_.input.defaultEnvironmentTemplateId,
        },
      );
      const reasoningLevel = UpdateAgentMutation.resolveReasoningLevel(
        arguments_.input.reasoningLevel,
        modelRecord.reasoningLevels ?? [],
      );
      const modelOptions = ModelOptionSelection.mergeWithDefaults(
        ModelOptionSelection.normalizeDefinitions(modelRecord.modelOptions),
        arguments_.input.modelOptions,
      );
      const autoCompactPercent = UpdateAgentMutation.resolveAutoCompactPercent(
        arguments_.input.autoCompactPercent,
        existingAgent.defaultAutoCompactPercent,
      );
      const updatedAgentRecords = await databaseTransaction
        .update(agents)
        .set({
          name: arguments_.input.name,
          title: UpdateAgentMutation.resolveTitle(arguments_.input.title),
          defaultModelProviderCredentialModelId: modelRecord.id,
          defaultComputeProviderDefinitionId: computeProviderDefinitionRecord.id,
          defaultEnvironmentTemplateId: environmentTemplate.templateId,
          defaultAutoCompactPercent: autoCompactPercent,
          defaultModelOptions: modelOptions,
          default_reasoning_level: reasoningLevel,
          system_prompt: UpdateAgentMutation.resolveSystemPrompt(arguments_.input.systemPrompt),
          updated_at: new Date(),
        })
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.id, existingAgent.id),
        ))
        .returning?.({
          id: agents.id,
          name: agents.name,
          title: agents.title,
          defaultModelProviderCredentialModelId: agents.defaultModelProviderCredentialModelId,
          defaultComputeProviderDefinitionId: agents.defaultComputeProviderDefinitionId,
          defaultEnvironmentTemplateId: agents.defaultEnvironmentTemplateId,
          defaultAutoCompactPercent: agents.defaultAutoCompactPercent,
          defaultReasoningLevel: agents.default_reasoning_level,
          defaultModelOptions: agents.defaultModelOptions,
          systemPrompt: agents.system_prompt,
          createdAt: agents.created_at,
          updatedAt: agents.updated_at,
        });
      const [agentRecord] = updatedAgentRecords ?? [];
      if (!agentRecord) {
        throw new Error("Failed to update agent.");
      }

      return UpdateAgentMutation.serializeRecord(
        agentRecord,
        modelRecord,
        credentialRecord,
        computeProviderDefinitionRecord,
        environmentTemplate,
      );
    });
  };

  private static resolveReasoningLevel(
    reasoningLevel: string | null | undefined,
    supportedLevels: string[],
  ): string | null {
    if (supportedLevels.length === 0) {
      if (reasoningLevel === undefined || reasoningLevel === null || reasoningLevel === "") {
        return null;
      }

      throw new Error("Selected model does not support reasoning levels.");
    }

    if (reasoningLevel === undefined || reasoningLevel === null || reasoningLevel === "") {
      throw new Error("reasoningLevel is required for the selected model.");
    }
    if (!supportedLevels.includes(reasoningLevel)) {
      throw new Error("Unsupported reasoning level.");
    }

    return reasoningLevel;
  }

  private static resolveTitle(title: string | null | undefined): string | null {
    if (title === undefined || title === null || title === "") {
      return null;
    }

    return title;
  }

  private static resolveSystemPrompt(systemPrompt: string | null | undefined): string | null {
    if (systemPrompt === undefined || systemPrompt === null || systemPrompt === "") {
      return null;
    }

    return systemPrompt;
  }

  private static resolveAutoCompactPercent(
    autoCompactPercent: number | null | undefined,
    fallbackAutoCompactPercent: number,
  ): number {
    if (autoCompactPercent === undefined || autoCompactPercent === null) {
      return fallbackAutoCompactPercent;
    }

    if (!Number.isFinite(autoCompactPercent)) {
      throw new Error("autoCompactPercent must be a finite integer between 1 and 100.");
    }

    const normalizedAutoCompactPercent = Math.trunc(autoCompactPercent);
    if (normalizedAutoCompactPercent < 1 || normalizedAutoCompactPercent > 100) {
      throw new Error("autoCompactPercent must be between 1 and 100.");
    }

    return normalizedAutoCompactPercent;
  }

  private async loadModelSelection(
    databaseTransaction: DatabaseTransaction,
    companyId: string,
    input: UpdateAgentMutationArguments["input"],
  ): Promise<{ credentialRecord: CredentialRecord; modelRecord: ModelRecord }> {
    if (input.llmModelId.length === 0) {
      throw new Error("llmModelId is required.");
    }

    const userProvidedSelection = await this.loadUserProvidedModelSelection(
      databaseTransaction,
      companyId,
      input.llmModelId,
    );
    if (userProvidedSelection) {
      return userProvidedSelection;
    }

    throw new Error("Provider model not found.");
  }

  private async loadUserProvidedModelSelection(
    databaseTransaction: DatabaseTransaction,
    companyId: string,
    llmModelId: string,
  ): Promise<{ credentialRecord: CredentialRecord; modelRecord: ModelRecord } | null> {
    const [modelRecord] = await databaseTransaction
      .select({
        id: modelProviderCredentialModels.id,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        name: modelProviderCredentialModels.name,
        modelOptions: modelProviderCredentialModels.modelOptions,
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.id, llmModelId),
      )) as ModelRecord[];
    if (!modelRecord) {
      return null;
    }

    const [credentialRecord] = await databaseTransaction
      .select({
        id: modelProviderCredentials.id,
        modelProvider: modelProviderCredentials.modelProvider,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.id, modelRecord.modelProviderCredentialId),
      )) as CredentialRecord[];
    if (!credentialRecord) {
      throw new Error("Provider credential not found.");
    }
    return {
      credentialRecord,
      modelRecord,
    };
  }

  private static serializeRecord(
    agentRecord: AgentRecord,
    modelRecord: ModelRecord,
    credentialRecord: CredentialRecord,
    computeProviderDefinitionRecord: ComputeProviderDefinitionRecord,
    environmentTemplate: AgentEnvironmentTemplate,
  ): GraphqlAgentRecord {
    return {
      autoCompactPercent: agentRecord.defaultAutoCompactPercent,
      defaultComputeProvider: computeProviderDefinitionRecord.provider,
      defaultComputeProviderDefinitionId: agentRecord.defaultComputeProviderDefinitionId,
      defaultComputeProviderDefinitionName: computeProviderDefinitionRecord.name,
      defaultEnvironmentTemplateId: agentRecord.defaultEnvironmentTemplateId,
      environmentTemplate,
      id: agentRecord.id,
      name: agentRecord.name,
      title: agentRecord.title,
      llmModelId: agentRecord.defaultModelProviderCredentialModelId,
      modelProviderCredentialId: credentialRecord.id,
      modelProviderCredentialModelId: agentRecord.defaultModelProviderCredentialModelId,
      modelProvider: credentialRecord.modelProvider,
      modelName: modelRecord.name,
      modelOptions: agentRecord.defaultModelOptions,
      reasoningLevel: agentRecord.defaultReasoningLevel,
      systemPrompt: agentRecord.systemPrompt,
      createdAt: agentRecord.createdAt.toISOString(),
      updatedAt: agentRecord.updatedAt.toISOString(),
    };
  }
}
