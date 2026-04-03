import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agents,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { AgentEnvironmentRequirementsService } from "../../services/agent/environment/requirements_service.ts";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddAgentMutationArguments = {
  input: {
    environmentRequirements?: {
      minCpuCount: number;
      minDiskSpaceGb: number;
      minMemoryGb: number;
    } | null;
    defaultComputeProviderDefinitionId: string;
    modelProviderCredentialId: string;
    modelProviderCredentialModelId: string;
    name: string;
    reasoningLevel?: string | null;
    secretIds?: string[] | null;
    systemPrompt?: string | null;
  };
};

type AgentRecord = {
  id: string;
  name: string;
  defaultModelProviderCredentialModelId: string | null;
  defaultComputeProviderDefinitionId: string | null;
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
  provider: "daytona" | "e2b";
};

type GraphqlAgentRecord = {
  defaultComputeProvider: "daytona" | "e2b" | null;
  defaultComputeProviderDefinitionId: string | null;
  defaultComputeProviderDefinitionName: string | null;
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
  private readonly requirementsService: AgentEnvironmentRequirementsService;

  constructor(
    @inject(SecretService) secretService: SecretService,
    @inject(AgentEnvironmentRequirementsService)
    requirementsService: AgentEnvironmentRequirementsService,
  ) {
    super();
    this.secretService = secretService;
    this.requirementsService = requirementsService;
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

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
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
          eq(modelProviderCredentials.companyId, context.authSession.company.id),
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
          eq(modelProviderCredentialModels.companyId, context.authSession.company.id),
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
          eq(computeProviderDefinitions.companyId, context.authSession.company.id),
          eq(computeProviderDefinitions.id, arguments_.input.defaultComputeProviderDefinitionId),
        )) as ComputeProviderDefinitionRecord[];
      if (!computeProviderDefinitionRecord) {
        throw new Error("Compute provider definition not found.");
      }

      const reasoningLevel = AddAgentMutation.resolveReasoningLevel(
        arguments_.input.reasoningLevel,
        modelRecord.reasoningLevels ?? [],
      );
      const now = new Date();
      const [agentRecord] = await databaseTransaction
        .insert(agents)
        .values({
          companyId: context.authSession.company.id,
          name: arguments_.input.name,
          defaultModelProviderCredentialModelId: modelRecord.id,
          defaultComputeProviderDefinitionId: computeProviderDefinitionRecord.id,
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
          defaultReasoningLevel: agents.default_reasoning_level,
          systemPrompt: agents.system_prompt,
          createdAt: agents.created_at,
          updatedAt: agents.updated_at,
        }) as Promise<AgentRecord[]>;
      if (!agentRecord) {
        throw new Error("Failed to create agent.");
      }

      for (const secretId of AddAgentMutation.resolveSecretIds(arguments_.input.secretIds)) {
        await this.secretService.attachSecretToAgent(transactionProvider, {
          agentId: agentRecord.id,
          companyId: context.authSession.company.id,
          secretId,
          userId: context.authSession.user.id,
        });
      }

      const environmentRequirements = AddAgentMutation.resolveEnvironmentRequirements(
        arguments_.input.environmentRequirements,
      );
      if (environmentRequirements) {
        await this.requirementsService.updateRequirements(transactionProvider, {
          agentId: agentRecord.id,
          companyId: context.authSession.company.id,
          minCpuCount: environmentRequirements.minCpuCount,
          minDiskSpaceGb: environmentRequirements.minDiskSpaceGb,
          minMemoryGb: environmentRequirements.minMemoryGb,
        });
      }

      return AddAgentMutation.serializeRecord(
        agentRecord,
        modelRecord,
        credentialRecord,
        computeProviderDefinitionRecord,
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
    if (!secretIds || secretIds.length === 0) {
      return [];
    }

    return [...new Set(secretIds.filter((secretId) => secretId.length > 0))];
  }

  private static resolveEnvironmentRequirements(
    environmentRequirements: AddAgentMutationArguments["input"]["environmentRequirements"],
  ): AddAgentMutationArguments["input"]["environmentRequirements"] {
    if (!environmentRequirements) {
      return null;
    }

    return environmentRequirements;
  }

  private static serializeRecord(
    agentRecord: AgentRecord,
    modelRecord: ModelRecord,
    credentialRecord: CredentialRecord,
    computeProviderDefinitionRecord: ComputeProviderDefinitionRecord,
  ): GraphqlAgentRecord {
    return {
      defaultComputeProvider: computeProviderDefinitionRecord.provider,
      defaultComputeProviderDefinitionId: agentRecord.defaultComputeProviderDefinitionId,
      defaultComputeProviderDefinitionName: computeProviderDefinitionRecord.name,
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
