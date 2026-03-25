import { ModelRegistry } from "../../ai_providers/model_registry.js";
import type { ModelProviderModel } from "../../ai_providers/model_provider_model.js";
import type { ModelAdapterInterface } from "./model_adapter_interface.ts";

type AnthropicModelsResponse = {
  data?: Array<{
    id?: string;
    name?: string;
  }>;
};

/**
 * Validates Anthropic credentials against the provider models endpoint, then keeps only the models
 * that are both provider-visible and present in the local registry.
 */
export class AnthropicModelAdapter implements ModelAdapterInterface {
  private readonly modelRegistry: ModelRegistry;

  constructor(modelRegistry: ModelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  async fetchModels(apiKey: string): Promise<ModelProviderModel[]> {
    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": normalizedApiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch models for anthropic: ${response.status} ${body}`);
    }

    const payload = await response.json() as AnthropicModelsResponse;
    if (!Array.isArray(payload.data)) {
      throw new Error("Invalid model list response for anthropic.");
    }

    const availableModelIds = new Set(
      payload.data.map((model) => String(model.id || model.name || "").trim()).filter((modelId) => modelId.length > 0),
    );

    return this.modelRegistry
      .getModelsForProvider("anthropic")
      .filter((model) => availableModelIds.has(model.modelId));
  }
}
