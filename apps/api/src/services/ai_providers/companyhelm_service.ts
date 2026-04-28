import { inject, injectable } from "inversify";
import { ModelProviderModel } from "./model_provider_model.ts";
import { ModelRegistry } from "./model_registry.ts";

/**
 * Centralizes the CompanyHelm-managed provider identity and default model policy. Runtime access
 * comes from routed platform model credentials, so this class only preserves the product-facing
 * provider label and catalog defaults.
 */
@injectable()
export class CompanyHelmLlmProviderService {
  static readonly CREDENTIAL_NAME = "CompanyHelm";
  static readonly PROVIDER_ID = "companyhelm";
  private readonly modelRegistry: ModelRegistry;

  constructor(
    @inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry(),
  ) {
    this.modelRegistry = modelRegistry;
  }

  getCredentialName(): string {
    return CompanyHelmLlmProviderService.CREDENTIAL_NAME;
  }

  getModelProvider(): "companyhelm" {
    return CompanyHelmLlmProviderService.PROVIDER_ID;
  }

  getSeedModels(): ModelProviderModel[] {
    return this.modelRegistry.getModelsForProvider(this.getModelProvider());
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
