import { eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { agents, modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

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

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Lists company-scoped agents together with the provider and model metadata backing each default
 * model selection.
 */
@injectable()
export class AgentsQueryResolver extends Resolver<GraphqlAgentRecord[]> {
  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlAgentRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const agentRecords = await selectableDatabase
        .select({
          id: agents.id,
          name: agents.name,
          defaultModelProviderCredentialModelId: agents.defaultModelProviderCredentialModelId,
          defaultReasoningLevel: agents.default_reasoning_level,
          systemPrompt: agents.system_prompt,
          createdAt: agents.created_at,
          updatedAt: agents.updated_at,
        })
        .from(agents)
        .where(eq(agents.companyId, context.authSession.company.id)) as AgentRecord[];

      const modelIds = agentRecords
        .map((agentRecord) => agentRecord.defaultModelProviderCredentialModelId)
        .filter((value): value is string => typeof value === "string");
      if (modelIds.length === 0) {
        return agentRecords.map((agentRecord) => AgentsQueryResolver.serializeRecord(agentRecord, null, null));
      }

      const modelRecords = await selectableDatabase
        .select({
          id: modelProviderCredentialModels.id,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          name: modelProviderCredentialModels.name,
        })
        .from(modelProviderCredentialModels)
        .where(inArray(modelProviderCredentialModels.id, modelIds)) as ModelRecord[];
      const credentialIds = modelRecords.map((modelRecord) => modelRecord.modelProviderCredentialId);
      const credentialRecords = credentialIds.length === 0
        ? []
        : await selectableDatabase
          .select({
            id: modelProviderCredentials.id,
            modelProvider: modelProviderCredentials.modelProvider,
          })
          .from(modelProviderCredentials)
          .where(inArray(modelProviderCredentials.id, credentialIds)) as CredentialRecord[];

      const modelById = new Map(modelRecords.map((modelRecord) => [modelRecord.id, modelRecord]));
      const credentialById = new Map(
        credentialRecords.map((credentialRecord) => [credentialRecord.id, credentialRecord]),
      );

      return agentRecords.map((agentRecord) => {
        const modelRecord = agentRecord.defaultModelProviderCredentialModelId
          ? modelById.get(agentRecord.defaultModelProviderCredentialModelId) ?? null
          : null;
        const credentialRecord = modelRecord
          ? credentialById.get(modelRecord.modelProviderCredentialId) ?? null
          : null;

        return AgentsQueryResolver.serializeRecord(agentRecord, modelRecord, credentialRecord);
      });
    });
  };

  private static serializeRecord(
    agentRecord: AgentRecord,
    modelRecord: ModelRecord | null,
    credentialRecord: CredentialRecord | null,
  ): GraphqlAgentRecord {
    return {
      id: agentRecord.id,
      name: agentRecord.name,
      modelProvider: credentialRecord?.modelProvider ?? null,
      modelName: modelRecord?.name ?? null,
      reasoningLevel: agentRecord.defaultReasoningLevel,
      systemPrompt: agentRecord.systemPrompt,
      createdAt: agentRecord.createdAt.toISOString(),
      updatedAt: agentRecord.updatedAt.toISOString(),
    };
  }
}
