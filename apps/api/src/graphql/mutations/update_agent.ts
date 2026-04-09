import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agents,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../../db/schema.ts";
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
    modelProviderCredentialId: string;
    modelProviderCredentialModelId: string;
    reasoningLevel?: string | null;
    systemPrompt?: string | null;
  };
};

type AgentRecord = {
  id: string;
  name: string;
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
  modelProviderCredentialId: string;
  name: string;
  reasoningLevels: string[] | null;
};

type CredentialRecord = {
  id: string;
  modelProvider: "openai" | "anthropic" | "openai-codex";
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
  modelProviderCredentialId: string | null;
  modelProviderCredentialModelId: string | null;
  modelProvider: "openai" | "anthropic" | "openai-codex" | null;
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
      async resolveTemplateForProvider(_transactionProvider, input) {
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
    if (arguments_.input.modelProviderCredentialId.length === 0) {
      throw new Error("modelProviderCredentialId is required.");
    }
    if (arguments_.input.modelProviderCredentialModelId.length === 0) {
      throw new Error("modelProviderCredentialModelId is required.");
    }
    if (arguments_.input.defaultComputeProviderDefinitionId.length === 0) {
      throw new Error("defaultComputeProviderDefinitionId is required.");
    }
    if (arguments_.input.defaultEnvironmentTemplateId.length === 0) {
      throw new Error("defaultEnvironmentTemplateId is required.");
    }
    const authSession = context.authSession;
    const runtimeTransactionProvider = context.app_runtime_transaction_provider;

    return runtimeTransactionProvider.transaction(async (tx) => {
      const databaseTransaction = tx as DatabaseTransaction;
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
          eq(agents.companyId, authSession.company.id),
          eq(agents.id, arguments_.input.id),
        )) as ExistingAgentRecord[];
      if (!existingAgent) {
        throw new Error("Agent not found.");
      }

      const [credentialRecord] = await databaseTransaction
        .select({
          id: modelProviderCredentials.id,
          modelProvider: modelProviderCredentials.modelProvider,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, authSession.company.id),
          eq(modelProviderCredentials.id, arguments_.input.modelProviderCredentialId),
        )) as CredentialRecord[];
      if (!credentialRecord) {
        throw new Error("Provider credential not found.");
      }

      const [modelRecord] = await databaseTransaction
        .select({
          id: modelProviderCredentialModels.id,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          name: modelProviderCredentialModels.name,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, authSession.company.id),
          eq(modelProviderCredentialModels.id, arguments_.input.modelProviderCredentialModelId),
        )) as ModelRecord[];
      if (!modelRecord) {
        throw new Error("Provider model not found.");
      }
      if (modelRecord.modelProviderCredentialId !== credentialRecord.id) {
        throw new Error("Provider model does not belong to the selected credential.");
      }

      const [computeProviderDefinitionRecord] = await databaseTransaction
        .select({
          id: computeProviderDefinitions.id,
          name: computeProviderDefinitions.name,
          provider: computeProviderDefinitions.provider,
        })
        .from(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, authSession.company.id),
          eq(computeProviderDefinitions.id, arguments_.input.defaultComputeProviderDefinitionId),
        )) as ComputeProviderDefinitionRecord[];
      if (!computeProviderDefinitionRecord) {
        throw new Error("Compute provider definition not found.");
      }
      const environmentTemplate = await this.templateService.resolveTemplateForProvider(
        transactionProvider as never,
        {
          companyId: authSession.company.id,
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
          defaultModelProviderCredentialModelId: modelRecord.id,
          defaultComputeProviderDefinitionId: computeProviderDefinitionRecord.id,
          defaultEnvironmentTemplateId: environmentTemplate.templateId,
          default_reasoning_level: reasoningLevel,
          system_prompt: UpdateAgentMutation.resolveSystemPrompt(arguments_.input.systemPrompt),
          updated_at: new Date(),
        })
        .where(and(
          eq(agents.companyId, authSession.company.id),
          eq(agents.id, existingAgent.id),
        ))
        .returning?.({
          id: agents.id,
          name: agents.name,
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
      modelProviderCredentialId: credentialRecord.id,
      modelProviderCredentialModelId: modelRecord.id,
      modelProvider: credentialRecord.modelProvider,
      modelName: modelRecord.name,
      reasoningLevel: agentRecord.defaultReasoningLevel,
      systemPrompt: agentRecord.systemPrompt,
      createdAt: agentRecord.createdAt.toISOString(),
      updatedAt: agentRecord.updatedAt.toISOString(),
    };
  }
}
