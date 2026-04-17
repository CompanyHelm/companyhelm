import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { ModelProviderModel } from "./model_provider_model.ts";
import { ModelRegistry } from "./model_registry.ts";

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

  getModelProvider(): "openai" {
    return "openai";
  }

  getStoredApiKeySentinel(): string {
    return CompanyHelmLlmProviderService.ENCRYPTED_API_KEY_SENTINEL;
  }

  getRuntimeApiKey(): string {
    const apiKey = this.config.companyhelm.llm.openai_api_key;
    if (apiKey.length === 0) {
      throw new Error("CompanyHelm OpenAI API key is not configured.");
    }

    return apiKey;
  }

  getSeedModels(): ModelProviderModel[] {
    return this.modelRegistry.getModelsForProvider(this.getModelProvider());
  }

  getDefaultModelId(): string | null {
    return this.modelRegistry.getDefaultModelForProvider(this.getModelProvider());
  }

  isReservedName(name: string): boolean {
    return name === CompanyHelmLlmProviderService.CREDENTIAL_NAME;
  }

  matchesCredential(credential: {
    isManaged: boolean;
  }): boolean {
    return credential.isManaged;
  }
}
