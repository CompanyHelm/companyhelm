import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import {
  agents,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
  platformModels,
} from "../../db/schema.ts";
import type { ModelProviderId } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type AgentQueryArguments = {
  id: string;
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
  modelProviderCredentialId: string;
  name: string;
};

type PlatformModelRecord = {
  id: string;
  modelProvider: ModelProviderId;
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
          defaultModelCredentialSource: agents.defaultModelCredentialSource,
          defaultPlatformModelId: agents.defaultPlatformModelId,
          defaultModelProviderCredentialModelId: agents.defaultModelProviderCredentialModelId,
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

      if (!agentRecord.defaultModelProviderCredentialModelId && !agentRecord.defaultPlatformModelId) {
        return AgentQueryResolver.serializeRecord(
          agentRecord,
          null,
          null,
          computeProviderDefinitionRecord ?? null,
        );
      }

      const [modelRecord] = agentRecord.defaultModelProviderCredentialModelId
        ? await selectableDatabase
          .select({
            id: modelProviderCredentialModels.id,
            modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
            name: modelProviderCredentialModels.name,
          })
          .from(modelProviderCredentialModels)
          .where(eq(modelProviderCredentialModels.id, agentRecord.defaultModelProviderCredentialModelId)) as ModelRecord[]
        : [];

      const [platformModelRecord] = agentRecord.defaultPlatformModelId
        ? await selectableDatabase
          .select({
            id: platformModels.id,
            modelProvider: platformModels.modelProvider,
            name: platformModels.name,
          })
          .from(platformModels)
          .where(eq(platformModels.id, agentRecord.defaultPlatformModelId)) as PlatformModelRecord[]
        : [];

      const [credentialRecord] = modelRecord
        ? await selectableDatabase
          .select({
            id: modelProviderCredentials.id,
            modelProvider: modelProviderCredentials.modelProvider,
          })
          .from(modelProviderCredentials)
          .where(eq(modelProviderCredentials.id, modelRecord.modelProviderCredentialId)) as CredentialRecord[]
        : platformModelRecord
        ? [{
          id: platformModelRecord.id,
          modelProvider: platformModelRecord.modelProvider,
        }]
        : [];

      return AgentQueryResolver.serializeRecord(
        agentRecord,
        modelRecord ?? platformModelRecord ?? null,
        credentialRecord ?? null,
        computeProviderDefinitionRecord ?? null,
      );
    });
  };

  private static serializeRecord(
    agentRecord: AgentRecord,
    modelRecord: ModelRecord | PlatformModelRecord | null,
    credentialRecord: CredentialRecord | null,
    computeProviderDefinitionRecord: ComputeProviderDefinitionRecord | null,
  ): GraphqlAgentRecord {
    return {
      defaultComputeProvider: computeProviderDefinitionRecord?.provider ?? null,
      defaultComputeProviderDefinitionId: agentRecord.defaultComputeProviderDefinitionId,
      defaultComputeProviderDefinitionName: computeProviderDefinitionRecord?.name ?? null,
      defaultEnvironmentTemplateId: agentRecord.defaultEnvironmentTemplateId,
      id: agentRecord.id,
      name: agentRecord.name,
      modelCredentialSource: agentRecord.defaultModelCredentialSource,
      modelCredentialKind: agentRecord.defaultModelCredentialSource === "platform" ? "managed" : "user_provided",
      modelOptionId: agentRecord.defaultPlatformModelId ?? agentRecord.defaultModelProviderCredentialModelId,
      platformModelId: agentRecord.defaultPlatformModelId,
      platformModelProviderCredentialModelId: null,
      modelProviderCredentialId: modelRecord && "modelProviderCredentialId" in modelRecord ? modelRecord.modelProviderCredentialId : null,
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
