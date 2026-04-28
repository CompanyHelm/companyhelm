import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  modelProviderCredentialModels,
  modelProviderCredentials,
  platformModelRoutes,
  platformModelProviderCredentials,
  platformModels,
} from "../../db/schema.ts";
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
  reasoningSupported: boolean;
  reasoningLevels: string[] | null;
};

type PlatformCredentialRecord = {
  id: string;
  isDefault: boolean;
  modelProvider: string;
  name: string;
};

type PlatformModelRecord = {
  id: string;
  isDefault: boolean;
  modelProvider: string;
  modelId: string;
  name: string;
  description: string;
  reasoningSupported: boolean;
  reasoningLevels: string[] | null;
};

type GraphqlAgentCreateModelOption = {
  id: string;
  modelCredentialSource: "platform" | "user_provided";
  platformModelId: string | null;
  platformModelProviderCredentialModelId: string | null;
  modelProviderCredentialModelId: string | null;
  modelId: string;
  name: string;
  description: string;
  reasoningSupported: boolean;
  reasoningLevels: string[];
};

type GraphqlAgentCreateProviderOption = {
  id: string;
  modelCredentialSource: "platform" | "user_provided";
  platformModelProviderCredentialId: string | null;
  modelProviderCredentialId: string | null;
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
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const platformCredentialRecords = await selectableDatabase
        .select({
          id: platformModelProviderCredentials.id,
          isDefault: platformModelProviderCredentials.isDefault,
          modelProvider: platformModelProviderCredentials.modelProvider,
          name: platformModelProviderCredentials.name,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.status, "active")) as PlatformCredentialRecord[];

      const platformModelRecords = await selectableDatabase
        .select({
          id: platformModels.id,
          isDefault: platformModels.isDefault,
          modelProvider: platformModels.modelProvider,
          modelId: platformModels.modelId,
          name: platformModels.name,
          description: platformModels.description,
          reasoningSupported: platformModels.reasoningSupported,
          reasoningLevels: platformModels.reasoningLevels,
        })
        .from(platformModels)
        .where(eq(platformModels.isAvailable, true)) as PlatformModelRecord[];
      const platformRouteRecords = await selectableDatabase
        .select({
          platformModelId: platformModelRoutes.platformModelId,
          platformModelProviderCredentialModelId: platformModelRoutes.platformModelProviderCredentialModelId,
        })
        .from(platformModelRoutes)
        .where(eq(platformModelRoutes.platformModelId, platformModelRoutes.platformModelId)) as Array<{
          platformModelId: string;
          platformModelProviderCredentialModelId: string;
        }>;

      const credentialRecords = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          isDefault: modelProviderCredentials.isDefault,
          modelProvider: modelProviderCredentials.modelProvider,
          name: modelProviderCredentials.name,
        })
        .from(modelProviderCredentials)
        .where(eq(modelProviderCredentials.companyId, companyId)) as CredentialRecord[];

      const modelRecords = await selectableDatabase
        .select({
          id: modelProviderCredentialModels.id,
          isDefault: modelProviderCredentialModels.isDefault,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          modelId: modelProviderCredentialModels.modelId,
          name: modelProviderCredentialModels.name,
          description: modelProviderCredentialModels.description,
          reasoningSupported: modelProviderCredentialModels.reasoningSupported,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(eq(modelProviderCredentialModels.companyId, companyId)) as ModelRecord[];

      const platformOption = this.createPlatformProviderOption(
        platformCredentialRecords,
        platformModelRecords,
        platformRouteRecords,
      );
      const companyOptions = credentialRecords
        .filter((credentialRecord) => this.isUserProvidedProvider(credentialRecord.modelProvider))
        .map((credentialRecord) => {
          const credentialModelRecords = modelRecords
            .filter((modelRecord) => modelRecord.modelProviderCredentialId === credentialRecord.id);
          const credentialModels = credentialModelRecords
            .map((modelRecord) => ({
              id: this.createModelOptionId(modelRecord.id),
              modelCredentialSource: "user_provided" as const,
              platformModelId: null,
              platformModelProviderCredentialModelId: null,
              modelProviderCredentialModelId: modelRecord.id,
              modelId: modelRecord.modelId,
              name: modelRecord.name,
              description: modelRecord.description,
              reasoningSupported: modelRecord.reasoningSupported,
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
            id: this.createProviderOptionId(credentialRecord.id),
            modelCredentialSource: "user_provided" as const,
            platformModelProviderCredentialId: null,
            modelProviderCredentialId: credentialRecord.id,
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

      return platformOption ? [platformOption, ...companyOptions] : companyOptions;
    });
  };

  private createPlatformProviderOption(
    platformCredentialRecords: PlatformCredentialRecord[],
    platformModelRecords: PlatformModelRecord[],
    platformRouteRecords: Array<{
      platformModelId: string;
      platformModelProviderCredentialModelId: string;
    }>,
  ): GraphqlAgentCreateProviderOption | null {
    void platformCredentialRecords;
    const platformModelIdsWithRoutes = new Set(platformRouteRecords.map((routeRecord) => routeRecord.platformModelId));

    const credentialModels = platformModelRecords
      .filter((modelRecord) => platformModelIdsWithRoutes.has(modelRecord.id))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((modelRecord) => ({
        id: this.createPlatformModelOptionId(modelRecord.id),
        modelCredentialSource: "platform" as const,
        platformModelId: modelRecord.id,
        platformModelProviderCredentialModelId: null,
        modelProviderCredentialModelId: null,
        modelId: modelRecord.modelId,
        name: modelRecord.name,
        description: modelRecord.description,
        reasoningSupported: modelRecord.reasoningSupported,
        reasoningLevels: modelRecord.reasoningLevels ?? [],
      }));
    if (credentialModels.length === 0) {
      return null;
    }

    const defaultModelId = this.modelRegistry.getDefaultModelForProvider("companyhelm")
      ?? credentialModels[0]?.modelId
      ?? null;
    const defaultModelRecord = credentialModels.find((modelRecord) => modelRecord.modelId === defaultModelId)
      ?? credentialModels[0]
      ?? null;
    const supportedReasoningLevels = defaultModelRecord?.reasoningLevels ?? [];
    const providerDefaultReasoningLevel = this.modelRegistry.getDefaultReasoningLevelForProvider("companyhelm");
    const defaultReasoningLevel = providerDefaultReasoningLevel
      && supportedReasoningLevels.includes(providerDefaultReasoningLevel)
      ? providerDefaultReasoningLevel
      : (supportedReasoningLevels[0] ?? null);

    return {
      id: "agent-create-provider-option:platform:companyhelm",
      modelCredentialSource: "platform",
      platformModelProviderCredentialId: null,
      modelProviderCredentialId: null,
      isDefault: platformCredentialRecords.some((credentialRecord) => credentialRecord.isDefault),
      label: "CompanyHelm",
      modelProvider: "companyhelm",
      defaultModelId: defaultModelRecord?.modelId ?? null,
      defaultReasoningLevel,
      models: credentialModels,
    };
  }

  /**
   * Namespaces option ids so Relay does not merge these projection records with the credential
   * entities they are derived from.
   */
  private createProviderOptionId(credentialId: string): string {
    return `agent-create-provider-option:${credentialId}`;
  }

  /**
   * Uses a dedicated id namespace for model options for the same reason as provider options:
   * Relay record ids must be globally unique across GraphQL types.
   */
  private createModelOptionId(modelProviderCredentialModelId: string): string {
    return `agent-create-model-option:${modelProviderCredentialModelId}`;
  }

  private createPlatformModelOptionId(platformModelId: string): string {
    return `agent-create-platform-model-option:${platformModelId}`;
  }

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

  private isUserProvidedProvider(modelProvider: string): boolean {
    return modelProvider !== "companyhelm" && modelProvider !== "system:companyhelm";
  }
}
