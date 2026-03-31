import { eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import {
  agents,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

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
          defaultComputeProviderDefinitionId: agents.defaultComputeProviderDefinitionId,
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
      const computeProviderDefinitionIds = agentRecords
        .map((agentRecord) => agentRecord.defaultComputeProviderDefinitionId)
        .filter((value): value is string => typeof value === "string");
      if (modelIds.length === 0) {
        const computeProviderDefinitionRecords = computeProviderDefinitionIds.length === 0
          ? []
          : await selectableDatabase
            .select({
              id: computeProviderDefinitions.id,
              name: computeProviderDefinitions.name,
              provider: computeProviderDefinitions.provider,
            })
            .from(computeProviderDefinitions)
            .where(inArray(computeProviderDefinitions.id, computeProviderDefinitionIds)) as ComputeProviderDefinitionRecord[];
        const computeProviderDefinitionById = new Map(
          computeProviderDefinitionRecords.map((definition) => [definition.id, definition]),
        );

        return agentRecords.map((agentRecord) => AgentsQueryResolver.serializeRecord(
          agentRecord,
          null,
          null,
          agentRecord.defaultComputeProviderDefinitionId
            ? computeProviderDefinitionById.get(agentRecord.defaultComputeProviderDefinitionId) ?? null
            : null,
        ));
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
      const computeProviderDefinitionRecords = computeProviderDefinitionIds.length === 0
        ? []
        : await selectableDatabase
          .select({
            id: computeProviderDefinitions.id,
            name: computeProviderDefinitions.name,
            provider: computeProviderDefinitions.provider,
          })
          .from(computeProviderDefinitions)
          .where(inArray(computeProviderDefinitions.id, computeProviderDefinitionIds)) as ComputeProviderDefinitionRecord[];

      const modelById = new Map(modelRecords.map((modelRecord) => [modelRecord.id, modelRecord]));
      const credentialById = new Map(
        credentialRecords.map((credentialRecord) => [credentialRecord.id, credentialRecord]),
      );
      const computeProviderDefinitionById = new Map(
        computeProviderDefinitionRecords.map((definition) => [definition.id, definition]),
      );

      return agentRecords.map((agentRecord) => {
        const modelRecord = agentRecord.defaultModelProviderCredentialModelId
          ? modelById.get(agentRecord.defaultModelProviderCredentialModelId) ?? null
          : null;
        const credentialRecord = modelRecord
          ? credentialById.get(modelRecord.modelProviderCredentialId) ?? null
          : null;
        const computeProviderDefinitionRecord = agentRecord.defaultComputeProviderDefinitionId
          ? computeProviderDefinitionById.get(agentRecord.defaultComputeProviderDefinitionId) ?? null
          : null;

        return AgentsQueryResolver.serializeRecord(
          agentRecord,
          modelRecord,
          credentialRecord,
          computeProviderDefinitionRecord,
        );
      });
    });
  };

  private static serializeRecord(
    agentRecord: AgentRecord,
    modelRecord: ModelRecord | null,
    credentialRecord: CredentialRecord | null,
    computeProviderDefinitionRecord: ComputeProviderDefinitionRecord | null,
  ): GraphqlAgentRecord {
    return {
      defaultComputeProvider: computeProviderDefinitionRecord?.provider ?? null,
      defaultComputeProviderDefinitionId: agentRecord.defaultComputeProviderDefinitionId,
      defaultComputeProviderDefinitionName: computeProviderDefinitionRecord?.name ?? null,
      id: agentRecord.id,
      name: agentRecord.name,
      modelProviderCredentialId: modelRecord?.modelProviderCredentialId ?? null,
      modelProviderCredentialModelId: agentRecord.defaultModelProviderCredentialModelId,
      modelProvider: credentialRecord?.modelProvider ?? null,
      modelName: modelRecord?.name ?? null,
      reasoningLevel: agentRecord.defaultReasoningLevel,
      systemPrompt: agentRecord.systemPrompt,
      createdAt: agentRecord.createdAt.toISOString(),
      updatedAt: agentRecord.updatedAt.toISOString(),
    };
  }
}
