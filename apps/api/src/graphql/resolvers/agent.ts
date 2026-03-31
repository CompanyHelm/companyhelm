import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { agents, modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import { AgentEnvironmentRequirementsService } from "../../services/agent/environment/requirements_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type AgentQueryArguments = {
  id: string;
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
};

type CredentialRecord = {
  id: string;
  modelProvider: "openai" | "anthropic";
};

type GraphqlAgentRecord = {
  id: string;
  name: string;
  modelProviderCredentialId: string | null;
  modelProviderCredentialModelId: string | null;
  modelProvider: "openai" | "anthropic" | null;
  modelName: string | null;
  reasoningLevel: string | null;
  systemPrompt: string | null;
  environmentRequirements: {
    minCpuCount: number;
    minDiskSpaceGb: number;
    minMemoryGb: number;
  };
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
  private readonly requirementsService: AgentEnvironmentRequirementsService;

  constructor(
    @inject(AgentEnvironmentRequirementsService)
    requirementsService: AgentEnvironmentRequirementsService = {
      async getRequirements() {
        throw new Error("Agent environment requirements service is not configured.");
      },
    } as never,
  ) {
    this.requirementsService = requirementsService;
  }

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

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [agentRecord] = await selectableDatabase
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
        .where(and(
          eq(agents.companyId, context.authSession.company.id),
          eq(agents.id, arguments_.id),
        )) as AgentRecord[];
      if (!agentRecord) {
        throw new Error("Agent not found.");
      }

      const environmentRequirements = await this.requirementsService.getRequirements(
        context.app_runtime_transaction_provider,
        context.authSession.company.id,
        agentRecord.id,
      );

      if (!agentRecord.defaultModelProviderCredentialModelId) {
        return AgentQueryResolver.serializeRecord(agentRecord, null, null, environmentRequirements);
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

      return AgentQueryResolver.serializeRecord(
        agentRecord,
        modelRecord ?? null,
        credentialRecord ?? null,
        environmentRequirements,
      );
    });
  };

  private static serializeRecord(
    agentRecord: AgentRecord,
    modelRecord: ModelRecord | null,
    credentialRecord: CredentialRecord | null,
    environmentRequirements: {
      minCpuCount: number;
      minDiskSpaceGb: number;
      minMemoryGb: number;
    },
  ): GraphqlAgentRecord {
    return {
      id: agentRecord.id,
      name: agentRecord.name,
      modelProviderCredentialId: modelRecord?.modelProviderCredentialId ?? null,
      modelProviderCredentialModelId: agentRecord.defaultModelProviderCredentialModelId,
      modelProvider: credentialRecord?.modelProvider ?? null,
      modelName: modelRecord?.name ?? null,
      reasoningLevel: agentRecord.defaultReasoningLevel,
      systemPrompt: agentRecord.systemPrompt,
      environmentRequirements,
      createdAt: agentRecord.createdAt.toISOString(),
      updatedAt: agentRecord.updatedAt.toISOString(),
    };
  }
}
