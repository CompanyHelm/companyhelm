import { inject, injectable } from "inversify";
import { ModelRegistry } from "./model_registry.ts";
import { ModelProviderModel } from "./model_provider_model.ts";
import { AnthropicModelAdapter } from "./providers/models-adapters/anthropic_model_adapter.ts";
import type { ModelAdapterInterface } from "./providers/models-adapters/model_adapter_interface.ts";
import { OpenAiModelAdapter } from "./providers/models-adapters/openai_model_adapter.ts";

/**
 * Resolves one provider adapter and delegates credential validation plus model lookup to that
 * implementation so provider-specific HTTP behavior stays out of GraphQL mutations.
 */
@injectable()
export class ModelService {
  private readonly providerAdapters: Map<string, ModelAdapterInterface>;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry) {
    this.providerAdapters = new Map<string, ModelAdapterInterface>([
      ["openai", new OpenAiModelAdapter(modelRegistry)],
      ["anthropic", new AnthropicModelAdapter(modelRegistry)],
    ]);
  }

  async fetchModels(modelProvider: string, apiKey: string): Promise<ModelProviderModel[]> {
    const normalizedProvider = String(modelProvider || "").trim();
    if (!normalizedProvider) {
      throw new Error("Model provider is required.");
    }

    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    const adapter = this.providerAdapters.get(normalizedProvider);
    if (!adapter) {
      throw new Error(`Unsupported model provider: ${normalizedProvider}`);
    }

    return adapter.fetchModels(normalizedApiKey);
  }
}

export { ModelProviderModel } from "./model_provider_model.ts";
