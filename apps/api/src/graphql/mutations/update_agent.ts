import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import {
  agents,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
  platformModels,
} from "../../db/schema.ts";
import type { ModelProviderId } from "../../services/ai_providers/model_provider_service.js";
import type { AgentEnvironmentTemplate } from "../../services/environments/providers/provider_interface.ts";
import { AgentEnvironmentTemplateService } from "../../services/environments/template_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateAgentMutationArguments = {
  input: {
    defaultComputeProviderDefinitionId: string;
    defaultEnvironmentTemplateId: string;
    id: string;
    name: string;
    modelOptionId?: string | null;
    modelCredentialSource?: "platform" | "user_provided" | null;
    platformModelId?: string | null;
    platformModelProviderCredentialModelId?: string | null;
    modelProviderCredentialId?: string | null;
    modelProviderCredentialModelId?: string | null;
    reasoningLevel?: string | null;
    systemPrompt?: string | null;
  };
};

type AgentRecord = {
  id: string;
  name: string;
  defaultModelCredentialSource: "platform" | "user_provided";
  defaultPlatformModelId: string | null;
  defaultModelProviderCredentialModelId: string | null;
  defaultComputeProviderDefinitionId: string | null;
  defaultEnvironmentTemplateId: string;
  defaultReasoningLevel: string | null;
  systemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ModelRecord = {
  id: string;
  modelCredentialSource: "platform" | "user_provided";
  modelProviderCredentialId: string;
  platformModelProviderCredentialId: string | null;
  name: string;
  reasoningLevels: string[] | null;
};

type CredentialRecord = {
  id: string;
  modelProvider: ModelProviderId;
};

type ExistingAgentRecord = {
  id: string;
};

type ComputeProviderDefinitionRecord = {
  id: string;
  name: string;
  provider: "e2b";
};

type GraphqlAgentRecord = {
  defaultComputeProvider: "e2b" | null;
  defaultComputeProviderDefinitionId: string | null;
  defaultComputeProviderDefinitionName: string | null;
  defaultEnvironmentTemplateId: string;
  environmentTemplate: AgentEnvironmentTemplate;
  id: string;
  name: string;
  modelCredentialSource: "platform" | "user_provided";
  modelCredentialKind: "managed" | "user_provided";
  modelOptionId: string | null;
  platformModelId: string | null;
  platformModelProviderCredentialModelId: string | null;
  modelProviderCredentialId: string | null;
  modelProviderCredentialModelId: string | null;
  modelProvider: ModelProviderId | null;
  modelName: string | null;
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
      const updatedAgentRecords = await databaseTransaction
        .update(agents)
        .set({
          name: arguments_.input.name,
          defaultModelCredentialSource: modelRecord.modelCredentialSource,
          defaultPlatformModelId: modelRecord.modelCredentialSource === "platform" ? modelRecord.id : null,
          defaultModelProviderCredentialModelId: modelRecord.modelCredentialSource === "user_provided" ? modelRecord.id : null,
          defaultComputeProviderDefinitionId: computeProviderDefinitionRecord.id,
          defaultEnvironmentTemplateId: environmentTemplate.templateId,
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
          defaultModelCredentialSource: agents.defaultModelCredentialSource,
          defaultPlatformModelId: agents.defaultPlatformModelId,
          defaultModelProviderCredentialModelId: agents.defaultModelProviderCredentialModelId,
          defaultComputeProviderDefinitionId: agents.defaultComputeProviderDefinitionId,
          defaultEnvironmentTemplateId: agents.defaultEnvironmentTemplateId,
          defaultReasoningLevel: agents.default_reasoning_level,
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

  private static resolveSystemPrompt(systemPrompt: string | null | undefined): string | null {
    if (systemPrompt === undefined || systemPrompt === null || systemPrompt === "") {
      return null;
    }

    return systemPrompt;
  }

  private static resolveModelCredentialSource(input: UpdateAgentMutationArguments["input"]): "platform" | "user_provided" {
    if (input.modelCredentialSource === "platform" || input.platformModelId || input.platformModelProviderCredentialModelId) {
      if (!input.platformModelId && !input.platformModelProviderCredentialModelId) {
        throw new Error("platformModelId is required.");
      }

      return "platform";
    }

    if (!input.modelProviderCredentialModelId) {
      throw new Error("modelProviderCredentialModelId is required.");
    }

    return "user_provided";
  }

  private async loadModelSelection(
    databaseTransaction: DatabaseTransaction,
    companyId: string,
    input: UpdateAgentMutationArguments["input"],
  ): Promise<{ credentialRecord: CredentialRecord; modelRecord: ModelRecord }> {
    const unifiedModelOptionId = input.modelOptionId ?? null;
    if (unifiedModelOptionId) {
      const userProvidedSelection = await this.loadUserProvidedModelSelection(
        databaseTransaction,
        companyId,
        unifiedModelOptionId,
      );
      if (userProvidedSelection) {
        return userProvidedSelection;
      }

      const platformSelection = await this.loadPlatformModelSelection(databaseTransaction, unifiedModelOptionId);
      if (platformSelection) {
        return platformSelection;
      }

      throw new Error("Provider model not found.");
    }

    const modelCredentialSource = UpdateAgentMutation.resolveModelCredentialSource(input);
    if (modelCredentialSource === "platform") {
      const platformSelection = await this.loadPlatformModelSelection(databaseTransaction, input.platformModelId ?? "");
      if (!platformSelection) {
        throw new Error("Platform provider model not found.");
      }

      return platformSelection;
    }

    const userProvidedSelection = await this.loadUserProvidedModelSelection(
      databaseTransaction,
      companyId,
      input.modelProviderCredentialModelId ?? "",
      input.modelProviderCredentialId ?? null,
    );
    if (!userProvidedSelection) {
      throw new Error("Provider model not found.");
    }

    return userProvidedSelection;
  }

  private async loadPlatformModelSelection(
    databaseTransaction: DatabaseTransaction,
    platformModelId: string,
  ): Promise<{ credentialRecord: CredentialRecord; modelRecord: ModelRecord } | null> {
    await PlatformAdminAccess.enable(databaseTransaction);
    const [modelRecord] = await databaseTransaction
      .select({
        id: platformModels.id,
        modelProvider: platformModels.modelProvider,
        name: platformModels.name,
        reasoningLevels: platformModels.reasoningLevels,
      })
      .from(platformModels)
      .where(and(
        eq(platformModels.id, platformModelId),
        eq(platformModels.isAvailable, true),
      )) as Array<{
        id: string;
        modelProvider: ModelProviderId;
        name: string;
        reasoningLevels: string[] | null;
      }>;
    if (!modelRecord) {
      return null;
    }

    return {
      credentialRecord: {
        id: modelRecord.id,
        modelProvider: modelRecord.modelProvider,
      },
      modelRecord: {
        ...modelRecord,
        modelCredentialSource: "platform",
        modelProviderCredentialId: modelRecord.id,
        platformModelProviderCredentialId: null,
      },
    };
  }

  private async loadUserProvidedModelSelection(
    databaseTransaction: DatabaseTransaction,
    companyId: string,
    modelProviderCredentialModelId: string,
    expectedCredentialId: string | null = null,
  ): Promise<{ credentialRecord: CredentialRecord; modelRecord: ModelRecord } | null> {
    const [modelRecord] = await databaseTransaction
      .select({
        id: modelProviderCredentialModels.id,
        modelCredentialSource: modelProviderCredentialModels.modelProviderCredentialId,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        platformModelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        name: modelProviderCredentialModels.name,
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.id, modelProviderCredentialModelId),
      )) as Array<ModelRecord & { modelCredentialSource: string }>;
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
    if (expectedCredentialId && modelRecord.modelProviderCredentialId !== expectedCredentialId) {
      throw new Error("Provider model does not belong to the selected credential.");
    }

    return {
      credentialRecord,
      modelRecord: {
        ...modelRecord,
        modelCredentialSource: "user_provided",
        platformModelProviderCredentialId: null,
      },
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
      defaultComputeProvider: computeProviderDefinitionRecord.provider,
      defaultComputeProviderDefinitionId: agentRecord.defaultComputeProviderDefinitionId,
      defaultComputeProviderDefinitionName: computeProviderDefinitionRecord.name,
      defaultEnvironmentTemplateId: agentRecord.defaultEnvironmentTemplateId,
      environmentTemplate,
      id: agentRecord.id,
      name: agentRecord.name,
      modelCredentialSource: agentRecord.defaultModelCredentialSource,
      modelCredentialKind: agentRecord.defaultModelCredentialSource === "platform" ? "managed" : "user_provided",
      modelOptionId: agentRecord.defaultPlatformModelId ?? agentRecord.defaultModelProviderCredentialModelId,
      platformModelId: agentRecord.defaultPlatformModelId,
      platformModelProviderCredentialModelId: null,
      modelProviderCredentialId: modelRecord.modelCredentialSource === "user_provided" ? credentialRecord.id : null,
      modelProviderCredentialModelId: agentRecord.defaultModelProviderCredentialModelId,
      modelProvider: credentialRecord.modelProvider,
      modelName: modelRecord.name,
      reasoningLevel: agentRecord.defaultReasoningLevel,
      systemPrompt: agentRecord.systemPrompt,
      createdAt: agentRecord.createdAt.toISOString(),
      updatedAt: agentRecord.updatedAt.toISOString(),
    };
  }
}
