import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { ModelProviderModel } from "./model_provider_model.ts";
import { ModelRegistry } from "./model_registry.ts";
import type { ModelService } from "./model_service.ts";

type WarningLogger = {
  warn(payload: Record<string, unknown>, message: string): void;
};

/**
 * Centralizes the CompanyHelm-managed LLM credential identity and the config-backed OpenAI API
 * key that powers it. Other services use this class to keep the reserved credential behavior,
 * seeded model catalog, and runtime API-key resolution consistent across bootstrap, GraphQL, and
 * session execution.
 */
@injectable()
export class CompanyHelmLlmProviderService {
  static readonly CREDENTIAL_NAME = "CompanyHelm";
  static readonly ENCRYPTED_API_KEY_SENTINEL = "companyhelm-managed-openai-api-key";
  static readonly PROVIDER_ID = "companyhelm";
  static readonly RUNTIME_PROVIDER_ID = "openai";
  private availableSeedModels: ModelProviderModel[] | null = null;
  private readonly config: Config;
  private readonly modelRegistry: ModelRegistry;

  constructor(
    @inject(Config) config: Config,
    @inject(ModelRegistry) modelRegistry: ModelRegistry,
  ) {
    this.config = config;
    this.modelRegistry = modelRegistry;
  }

  getCredentialName(): string {
    return CompanyHelmLlmProviderService.CREDENTIAL_NAME;
  }

  getModelProvider(): "companyhelm" {
    return CompanyHelmLlmProviderService.PROVIDER_ID;
  }

  getRuntimeModelProvider(): "openai" {
    return CompanyHelmLlmProviderService.RUNTIME_PROVIDER_ID;
  }

  getStoredApiKeySentinel(): string {
    return CompanyHelmLlmProviderService.ENCRYPTED_API_KEY_SENTINEL;
  }

  hasRuntimeApiKey(): boolean {
    return Boolean(this.config.companyhelm.llm?.openai_api_key);
  }

  getRuntimeApiKey(): string {
    const apiKey = this.config.companyhelm.llm?.openai_api_key;
    if (!apiKey) {
      throw new Error("CompanyHelm OpenAI API key is not configured.");
    }

    return apiKey;
  }

  getSeedModels(): ModelProviderModel[] {
    return this.availableSeedModels ?? this.modelRegistry.getModelsForProvider(this.getModelProvider());
  }

  async refreshAvailableSeedModels(
    modelService: Pick<ModelService, "fetchModels">,
    logger: WarningLogger,
  ): Promise<ModelProviderModel[]> {
    const configuredModels = this.modelRegistry.getModelsForProvider(this.getModelProvider());
    if (!this.hasRuntimeApiKey()) {
      this.availableSeedModels = configuredModels;
      return configuredModels;
    }

    try {
      const availableModels = await modelService.fetchModels(this.getModelProvider(), this.getRuntimeApiKey());
      const availableModelIds = new Set(availableModels.map((model) => model.modelId));
      const missingModelIds = configuredModels
        .filter((model) => !availableModelIds.has(model.modelId))
        .map((model) => model.modelId);
      if (missingModelIds.length > 0) {
        logger.warn({
          missingModelIds,
          provider: this.getModelProvider(),
          runtimeProvider: this.getRuntimeModelProvider(),
        }, "filtered unavailable CompanyHelm-managed models from the startup catalog");
      }

      this.availableSeedModels = availableModels;
      return availableModels;
    } catch (error) {
      logger.warn({
        error,
        provider: this.getModelProvider(),
        runtimeProvider: this.getRuntimeModelProvider(),
      }, "failed to validate CompanyHelm-managed models against the runtime API; keeping configured catalog");
      this.availableSeedModels = configuredModels;
      return configuredModels;
    }
  }

  getDefaultModelId(): string | null {
    return this.modelRegistry.getDefaultModelForProvider(this.getModelProvider());
  }

  getDefaultReasoningLevel(): string | null {
    return this.modelRegistry.getDefaultReasoningLevelForProvider(this.getModelProvider());
  }

  isReservedName(name: string): boolean {
    return name === CompanyHelmLlmProviderService.CREDENTIAL_NAME;
  }

  matchesCredential(credential: {
    modelProvider?: string;
  }): boolean {
    return credential.modelProvider === this.getModelProvider();
  }
}
