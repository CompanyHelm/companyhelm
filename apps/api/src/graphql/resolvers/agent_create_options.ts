import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentialModels, modelProviderCredentials } from "../../db/schema.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.js";
import { ModelProviderService } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type CredentialRecord = {
  id: string;
  isDefault: boolean;
  modelProvider: string;
  name: string;
};

type ModelRecord = {
  id: string;
  isDefault: boolean;
  modelProviderCredentialId: string;
  modelId: string;
  name: string;
  description: string;
  reasoningLevels: string[] | null;
};

type GraphqlAgentCreateModelOption = {
  id: string;
  modelId: string;
  name: string;
  description: string;
  reasoningLevels: string[];
};

type GraphqlAgentCreateProviderOption = {
  id: string;
  isDefault: boolean;
  label: string;
  modelProvider: string;
  defaultModelId: string | null;
  defaultReasoningLevel: string | null;
  models: GraphqlAgentCreateModelOption[];
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Lists provider/model combinations that can be used when creating an agent, grouped by credential
 * so the UI can render provider and model dropdowns without additional round-trips.
 */
@injectable()
export class AgentCreateOptionsQueryResolver extends Resolver<GraphqlAgentCreateProviderOption[]> {
  private readonly modelRegistry: ModelRegistry;
  private readonly modelProviderService: ModelProviderService;

  constructor(
    @inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry(),
    @inject(ModelProviderService) modelProviderService: ModelProviderService = new ModelProviderService(),
  ) {
    super();
    this.modelRegistry = modelRegistry;
    this.modelProviderService = modelProviderService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlAgentCreateProviderOption[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const credentialRecords = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          isDefault: modelProviderCredentials.isDefault,
          modelProvider: modelProviderCredentials.modelProvider,
          name: modelProviderCredentials.name,
        })
        .from(modelProviderCredentials)
        .where(eq(modelProviderCredentials.companyId, context.authSession.company.id)) as CredentialRecord[];

      const modelRecords = await selectableDatabase
        .select({
          id: modelProviderCredentialModels.id,
          isDefault: modelProviderCredentialModels.isDefault,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          modelId: modelProviderCredentialModels.modelId,
          name: modelProviderCredentialModels.name,
          description: modelProviderCredentialModels.description,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(eq(modelProviderCredentialModels.companyId, context.authSession.company.id)) as ModelRecord[];

      return credentialRecords
        .map((credentialRecord) => {
          const credentialModelRecords = modelRecords
            .filter((modelRecord) => modelRecord.modelProviderCredentialId === credentialRecord.id);
          const credentialModels = credentialModelRecords
            .map((modelRecord) => ({
              id: modelRecord.id,
              modelId: modelRecord.modelId,
              name: modelRecord.name,
              description: modelRecord.description,
              reasoningLevels: modelRecord.reasoningLevels ?? [],
            }));
          const defaultModelRecord = credentialModelRecords.find((modelRecord) => modelRecord.isDefault)
            ?? credentialModelRecords.find((modelRecord) =>
              modelRecord.modelId === this.modelRegistry.getDefaultModelForProvider(credentialRecord.modelProvider)
            )
            ?? credentialModelRecords[0]
            ?? null;
          const providerDefaultReasoningLevel = this.modelRegistry.getDefaultReasoningLevelForProvider(
            credentialRecord.modelProvider,
          );
          const supportedReasoningLevels = defaultModelRecord?.reasoningLevels ?? [];
          const defaultReasoningLevel = providerDefaultReasoningLevel
            && supportedReasoningLevels.includes(providerDefaultReasoningLevel)
            ? providerDefaultReasoningLevel
            : (supportedReasoningLevels[0] ?? null);

          return {
            id: credentialRecord.id,
            isDefault: credentialRecord.isDefault,
            label: this.resolveProviderLabel(credentialRecord),
            modelProvider: credentialRecord.modelProvider,
            defaultModelId: defaultModelRecord?.modelId ?? null,
            defaultReasoningLevel,
            models: credentialModels,
          };
        })
        .sort((left, right) => Number(right.isDefault) - Number(left.isDefault))
        .filter((providerOption) => providerOption.models.length > 0);
    });
  };

  private resolveProviderLabel(credentialRecord: CredentialRecord): string {
    const providerDefinition = this.modelProviderService.get(credentialRecord.modelProvider);
    if (credentialRecord.name === providerDefinition.name) {
      return providerDefinition.name;
    }

    if (credentialRecord.modelProvider === "openai" && credentialRecord.name === "OpenAI / Codex") {
      return "OpenAI / Codex";
    }

    return `${credentialRecord.name} (${credentialRecord.modelProvider})`;
  }
}
