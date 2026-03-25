import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { agents, modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddAgentMutationArguments = {
  input: {
    modelProviderCredentialId: string;
    modelProviderCredentialModelId: string;
    name: string;
    reasoningLevel?: string | null;
    systemPrompt?: string | null;
  };
};

type AgentRecord = {
  id: string;
  name: string;
  defaultModelProviderCredentialModelId: string | null;
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
  modelProvider: "openai" | "anthropic";
};

type GraphqlAgentRecord = {
  id: string;
  name: string;
  modelProvider: "openai" | "anthropic" | null;
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

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const databaseTransaction = tx as DatabaseTransaction;
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
          default_reasoning_level: reasoningLevel,
          system_prompt: AddAgentMutation.resolveSystemPrompt(arguments_.input.systemPrompt),
          created_at: now,
          updated_at: now,
        })
        .returning?.({
          id: agents.id,
          name: agents.name,
          defaultModelProviderCredentialModelId: agents.defaultModelProviderCredentialModelId,
          defaultReasoningLevel: agents.default_reasoning_level,
          systemPrompt: agents.system_prompt,
          createdAt: agents.created_at,
          updatedAt: agents.updated_at,
        }) as Promise<AgentRecord[]>;
      if (!agentRecord) {
        throw new Error("Failed to create agent.");
      }

      return AddAgentMutation.serializeRecord(agentRecord, modelRecord, credentialRecord);
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
    if (systemPrompt === undefined || systemPrompt === null) {
      return null;
    }

    return systemPrompt;
  }

  private static serializeRecord(
    agentRecord: AgentRecord,
    modelRecord: ModelRecord,
    credentialRecord: CredentialRecord,
  ): GraphqlAgentRecord {
    return {
      id: agentRecord.id,
      name: agentRecord.name,
      modelProvider: credentialRecord.modelProvider,
      modelName: modelRecord.name,
      reasoningLevel: agentRecord.defaultReasoningLevel,
      systemPrompt: agentRecord.systemPrompt,
      createdAt: agentRecord.createdAt.toISOString(),
      updatedAt: agentRecord.updatedAt.toISOString(),
    };
  }
}
