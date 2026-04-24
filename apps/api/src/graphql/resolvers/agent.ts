import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import {
  agents,
  computeProviderDefinitions,
  imageProviderCredentialModels,
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../../db/schema.ts";
import type { ModelProviderId } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type AgentQueryArguments = {
  id: string;
};

type AgentRecord = {
  id: string;
  name: string;
  defaultModelProviderCredentialModelId: string | null;
  defaultImageProviderCredentialModelId: string | null;
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
};

type ImageModelRecord = {
  id: string;
  modelProviderCredentialId: string;
  name: string;
};

type CredentialRecord = {
  id: string;
  modelProvider: ModelProviderId;
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
  id: string;
  imageModelName: string | null;
  imageProvider: ModelProviderId | null;
  imageProviderCredentialId: string | null;
  imageProviderCredentialModelId: string | null;
  name: string;
  modelProviderCredentialId: string | null;
  modelProviderCredentialModelId: string | null;
  modelProvider: ModelProviderId | null;
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
 * Loads one company-scoped agent together with the provider credential and model currently backing
 * that agent so the detail page can edit the persisted configuration directly.
 */
@injectable()
export class AgentQueryResolver {
  execute = async (
    _root: unknown,
    arguments_: AgentQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlAgentRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.id.length === 0) {
      throw new Error("id is required.");
    }
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const [agentRecord] = await selectableDatabase
        .select({
          id: agents.id,
          name: agents.name,
          defaultModelProviderCredentialModelId: agents.defaultModelProviderCredentialModelId,
          defaultImageProviderCredentialModelId: agents.defaultImageProviderCredentialModelId,
          defaultComputeProviderDefinitionId: agents.defaultComputeProviderDefinitionId,
          defaultEnvironmentTemplateId: agents.defaultEnvironmentTemplateId,
          defaultReasoningLevel: agents.default_reasoning_level,
          systemPrompt: agents.system_prompt,
          createdAt: agents.created_at,
          updatedAt: agents.updated_at,
        })
        .from(agents)
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.id, arguments_.id),
        )) as AgentRecord[];
      if (!agentRecord) {
        throw new Error("Agent not found.");
      }

      const [computeProviderDefinitionRecord] = agentRecord.defaultComputeProviderDefinitionId
        ? await selectableDatabase
          .select({
            id: computeProviderDefinitions.id,
            name: computeProviderDefinitions.name,
            provider: computeProviderDefinitions.provider,
          })
          .from(computeProviderDefinitions)
          .where(eq(computeProviderDefinitions.id, agentRecord.defaultComputeProviderDefinitionId)) as ComputeProviderDefinitionRecord[]
        : [];

      if (!agentRecord.defaultModelProviderCredentialModelId) {
        return AgentQueryResolver.serializeRecord(
          agentRecord,
          null,
          null,
          null,
          null,
          computeProviderDefinitionRecord ?? null,
        );
      }

      const [modelRecord] = await selectableDatabase
        .select({
          id: modelProviderCredentialModels.id,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          name: modelProviderCredentialModels.name,
        })
        .from(modelProviderCredentialModels)
        .where(eq(
          modelProviderCredentialModels.id,
          agentRecord.defaultModelProviderCredentialModelId,
        )) as ModelRecord[];

      const [credentialRecord] = modelRecord
        ? await selectableDatabase
          .select({
            id: modelProviderCredentials.id,
            modelProvider: modelProviderCredentials.modelProvider,
          })
          .from(modelProviderCredentials)
          .where(eq(modelProviderCredentials.id, modelRecord.modelProviderCredentialId)) as CredentialRecord[]
        : [];

      const [imageModelRecord] = agentRecord.defaultImageProviderCredentialModelId
        ? await selectableDatabase
          .select({
            id: imageProviderCredentialModels.id,
            modelProviderCredentialId: imageProviderCredentialModels.modelProviderCredentialId,
            name: imageProviderCredentialModels.name,
          })
          .from(imageProviderCredentialModels)
          .where(eq(imageProviderCredentialModels.id, agentRecord.defaultImageProviderCredentialModelId)) as ImageModelRecord[]
        : [];
      const [imageCredentialRecord] = imageModelRecord
        ? imageModelRecord.modelProviderCredentialId === credentialRecord?.id
          ? [credentialRecord]
          : await selectableDatabase
            .select({
              id: modelProviderCredentials.id,
              modelProvider: modelProviderCredentials.modelProvider,
            })
            .from(modelProviderCredentials)
            .where(eq(modelProviderCredentials.id, imageModelRecord.modelProviderCredentialId)) as CredentialRecord[]
        : [];

      return AgentQueryResolver.serializeRecord(
        agentRecord,
        modelRecord ?? null,
        credentialRecord ?? null,
        imageModelRecord ?? null,
        imageCredentialRecord ?? null,
        computeProviderDefinitionRecord ?? null,
      );
    });
  };

  private static serializeRecord(
    agentRecord: AgentRecord,
    modelRecord: ModelRecord | null,
    credentialRecord: CredentialRecord | null,
    imageModelRecord: ImageModelRecord | null,
    imageCredentialRecord: CredentialRecord | null,
    computeProviderDefinitionRecord: ComputeProviderDefinitionRecord | null,
  ): GraphqlAgentRecord {
    return {
      defaultComputeProvider: computeProviderDefinitionRecord?.provider ?? null,
      defaultComputeProviderDefinitionId: agentRecord.defaultComputeProviderDefinitionId,
      defaultComputeProviderDefinitionName: computeProviderDefinitionRecord?.name ?? null,
      defaultEnvironmentTemplateId: agentRecord.defaultEnvironmentTemplateId,
      id: agentRecord.id,
      imageModelName: imageModelRecord?.name ?? null,
      imageProvider: imageCredentialRecord?.modelProvider ?? null,
      imageProviderCredentialId: imageCredentialRecord?.id ?? null,
      imageProviderCredentialModelId: agentRecord.defaultImageProviderCredentialModelId,
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
