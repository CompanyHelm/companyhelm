import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agents,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
  platformModelProviderCredentialModels,
  platformModelProviderCredentials,
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
    modelCredentialSource?: "platform" | "user_provided" | null;
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
  defaultPlatformModelProviderCredentialModelId: string | null;
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

type PlatformCredentialRecord = {
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
    const modelCredentialSource = UpdateAgentMutation.resolveModelCredentialSource(arguments_.input);
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
        modelCredentialSource,
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
          defaultPlatformModelProviderCredentialModelId: modelRecord.modelCredentialSource === "platform" ? modelRecord.id : null,
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
          defaultPlatformModelProviderCredentialModelId: agents.defaultPlatformModelProviderCredentialModelId,
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
    if (input.modelCredentialSource === "platform" || input.platformModelProviderCredentialModelId) {
      if (!input.platformModelProviderCredentialModelId) {
        throw new Error("platformModelProviderCredentialModelId is required.");
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
    modelCredentialSource: "platform" | "user_provided",
    input: UpdateAgentMutationArguments["input"],
  ): Promise<{ credentialRecord: CredentialRecord; modelRecord: ModelRecord }> {
    if (modelCredentialSource === "platform") {
      const [modelRecord] = await databaseTransaction
        .select({
          id: platformModelProviderCredentialModels.id,
          platformModelProviderCredentialId: platformModelProviderCredentialModels.platformModelProviderCredentialId,
          name: platformModelProviderCredentialModels.name,
          reasoningLevels: platformModelProviderCredentialModels.reasoningLevels,
        })
        .from(platformModelProviderCredentialModels)
        .where(and(
          eq(platformModelProviderCredentialModels.id, input.platformModelProviderCredentialModelId ?? ""),
          eq(platformModelProviderCredentialModels.isAvailable, true),
        )) as Array<{
          id: string;
          name: string;
          platformModelProviderCredentialId: string;
          reasoningLevels: string[] | null;
        }>;
      if (!modelRecord) {
        throw new Error("Platform provider model not found.");
      }

      const [platformCredentialRecord] = await databaseTransaction
        .select({
          id: platformModelProviderCredentials.id,
          modelProvider: platformModelProviderCredentials.modelProvider,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.id, modelRecord.platformModelProviderCredentialId)) as PlatformCredentialRecord[];
      if (!platformCredentialRecord) {
        throw new Error("Platform provider credential not found.");
      }

      return {
        credentialRecord: platformCredentialRecord,
        modelRecord: {
          ...modelRecord,
          modelCredentialSource: "platform",
          modelProviderCredentialId: platformCredentialRecord.id,
          platformModelProviderCredentialId: platformCredentialRecord.id,
        },
      };
    }

    const [credentialRecord] = await databaseTransaction
      .select({
        id: modelProviderCredentials.id,
        modelProvider: modelProviderCredentials.modelProvider,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.id, input.modelProviderCredentialId ?? ""),
      )) as CredentialRecord[];
    if (!credentialRecord) {
      throw new Error("Provider credential not found.");
    }

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
        eq(modelProviderCredentialModels.id, input.modelProviderCredentialModelId ?? ""),
      )) as Array<ModelRecord & { modelCredentialSource: string }>;
    if (!modelRecord) {
      throw new Error("Provider model not found.");
    }
    if (modelRecord.modelProviderCredentialId !== credentialRecord.id) {
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
      platformModelProviderCredentialModelId: agentRecord.defaultPlatformModelProviderCredentialModelId,
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
