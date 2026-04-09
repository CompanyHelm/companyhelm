import { OpenRouterCatalogService } from "../../ai_providers/openrouter_catalog_service.js";
import { ModelProviderModel } from "../../ai_providers/model_provider_model.js";
import type { ModelAdapterInterface } from "./model_adapter_interface.ts";

/**
 * Validates OpenRouter API keys and mirrors the full remote catalog into CompanyHelm's normalized
 * model rows so operators can pick any model currently exposed by OpenRouter.
 */
export class OpenRouterModelAdapter implements ModelAdapterInterface {
  private readonly openRouterCatalogService: OpenRouterCatalogService;

  constructor(openRouterCatalogService: OpenRouterCatalogService = new OpenRouterCatalogService()) {
    this.openRouterCatalogService = openRouterCatalogService;
  }

  async fetchModels(apiKey: string): Promise<ModelProviderModel[]> {
    const models = await this.openRouterCatalogService.fetchCatalog(apiKey);

    return models.map((model) => new ModelProviderModel({
      provider: "openrouter",
      modelId: model.modelId,
      name: model.name,
      description: model.description,
      reasoningSupported: model.reasoningSupported,
      reasoningLevels: null,
    }));
  }
}
