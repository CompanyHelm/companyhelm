import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agents,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type { AgentEnvironmentTemplate } from "../../services/environments/providers/provider_interface.ts";
import { AgentEnvironmentTemplateService } from "../../services/environments/template_service.ts";
import { SecretService } from "../../services/secrets/service.ts";
import { SkillService } from "../../services/skills/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddAgentMutationArguments = {
  input: {
    defaultComputeProviderDefinitionId: string;
    defaultEnvironmentTemplateId: string;
    modelProviderCredentialId: string;
    modelProviderCredentialModelId: string;
    name: string;
    reasoningLevel?: string | null;
    secretIds?: string[] | null;
    skillGroupIds?: string[] | null;
    skillIds?: string[] | null;
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
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<AgentRecord[]>;
    };
  };
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Creates a company-scoped agent bound to one provider credential model and validates that the
 * selected reasoning level is compatible with that model.
 */
@injectable()
export class AddAgentMutation extends Mutation<AddAgentMutationArguments, GraphqlAgentRecord> {
  private readonly secretService: SecretService;
  private readonly skillService: SkillService;
  private readonly templateService: AgentEnvironmentTemplateService;

  constructor(
    @inject(SecretService)
    secretService: SecretService = {
      async attachSecretToAgent() {
        throw new Error("Secret service is not configured.");
      },
    } as never,
    @inject(SkillService)
    skillService: SkillService = {
      async attachSkillGroupToAgent() {
        throw new Error("Skill service is not configured.");
      },
      async attachSkillToAgent() {
        throw new Error("Skill service is not configured.");
      },
    } as never,
    @inject(AgentEnvironmentTemplateService)
    templateService: AgentEnvironmentTemplateService = {
      async resolveTemplateForProvider(
        _transactionProvider: TransactionProviderInterface,
        input: {
          companyId: string;
          providerDefinitionId: string;
          templateId: string;
        },
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
    this.secretService = secretService;
    this.skillService = skillService;
    this.templateService = templateService;
  }

  protected resolve = async (
    arguments_: AddAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlAgentRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
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
      const transactionProvider: TransactionProviderInterface = {
        async transaction(transaction) {
          return transaction(tx as never);
        },
      };
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
        transactionProvider,
        {
          companyId: authSession.company.id,
          providerDefinitionId: computeProviderDefinitionRecord.id,
          templateId: arguments_.input.defaultEnvironmentTemplateId,
        },
      );

      const reasoningLevel = AddAgentMutation.resolveReasoningLevel(
        arguments_.input.reasoningLevel,
        modelRecord.reasoningLevels ?? [],
      );
      const now = new Date();
      const insertedAgentRecords = await databaseTransaction
        .insert(agents)
        .values({
          companyId: authSession.company.id,
          name: arguments_.input.name,
          defaultModelProviderCredentialModelId: modelRecord.id,
          defaultComputeProviderDefinitionId: computeProviderDefinitionRecord.id,
          defaultEnvironmentTemplateId: environmentTemplate.templateId,
          default_reasoning_level: reasoningLevel,
          system_prompt: AddAgentMutation.resolveSystemPrompt(arguments_.input.systemPrompt),
          created_at: now,
          updated_at: now,
        })
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
      const [agentRecord] = insertedAgentRecords ?? [];
      if (!agentRecord) {
        throw new Error("Failed to create agent.");
      }

      for (const secretId of AddAgentMutation.resolveSecretIds(arguments_.input.secretIds)) {
        await this.secretService.attachSecretToAgent(transactionProvider, {
          agentId: agentRecord.id,
          companyId: authSession.company.id,
          secretId,
          userId: authSession.user.id,
        });
      }
      for (const skillGroupId of AddAgentMutation.resolveDistinctIds(arguments_.input.skillGroupIds)) {
        await this.skillService.attachSkillGroupToAgent(transactionProvider, {
          agentId: agentRecord.id,
          companyId: authSession.company.id,
          skillGroupId,
          userId: authSession.user.id,
        });
      }
      for (const skillId of AddAgentMutation.resolveDistinctIds(arguments_.input.skillIds)) {
        await this.skillService.attachSkillToAgent(transactionProvider, {
          agentId: agentRecord.id,
          companyId: authSession.company.id,
          skillId,
          userId: authSession.user.id,
        });
      }

      return AddAgentMutation.serializeRecord(
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

  private static resolveSecretIds(secretIds: string[] | null | undefined): string[] {
    return AddAgentMutation.resolveDistinctIds(secretIds);
  }

  private static resolveDistinctIds(ids: string[] | null | undefined): string[] {
    if (!ids || ids.length === 0) {
      return [];
    }

    return [...new Set(ids.filter((id) => id.length > 0))];
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
