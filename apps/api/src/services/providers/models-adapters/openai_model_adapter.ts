import { ModelRegistry } from "../../ai_providers/model_registry.js";
import type { ModelProviderModel } from "../../ai_providers/model_provider_model.js";
import type { ModelAdapterInterface } from "./model_adapter_interface.ts";

type OpenAiModelsResponse = {
  data?: Array<{
    id?: string;
  }>;
};

/**
 * Validates OpenAI credentials against the public models endpoint, then keeps only the models that
 * are both provider-visible and present in the local registry that carries reasoning metadata.
 */
export class OpenAiModelAdapter implements ModelAdapterInterface {
  private readonly providerId: string;
  private readonly modelRegistryProviderId: string;
  private readonly modelRegistry: ModelRegistry;

  constructor(modelRegistry: ModelRegistry, providerId: string, modelRegistryProviderId: string = providerId) {
    this.modelRegistry = modelRegistry;
    this.providerId = providerId;
    this.modelRegistryProviderId = modelRegistryProviderId;
  }

  async fetchModels(apiKey: string): Promise<ModelProviderModel[]> {
    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${normalizedApiKey}`,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch models for ${this.providerId}: ${response.status} ${body}`);
    }

    const payload = await response.json() as OpenAiModelsResponse;
    if (!Array.isArray(payload.data)) {
      throw new Error(`Invalid model list response for ${this.providerId}.`);
    }

    const availableModelIds = new Set(
      payload.data.map((model) => String(model.id || "").trim()).filter((modelId) => modelId.length > 0),
    );

    return this.modelRegistry
      .getModelsForProvider(this.modelRegistryProviderId)
      .filter((model) => availableModelIds.has(model.modelId));
  }
}
