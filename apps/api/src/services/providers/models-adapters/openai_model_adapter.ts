import { ModelRegistry } from "../../model_registry.ts";
import type { ModelProviderModel } from "../../model_provider_model.ts";
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
  private readonly modelRegistry: ModelRegistry;

  constructor(modelRegistry: ModelRegistry) {
    this.modelRegistry = modelRegistry;
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
      throw new Error(`Failed to fetch models for openai: ${response.status} ${body}`);
    }

    const payload = await response.json() as OpenAiModelsResponse;
    if (!Array.isArray(payload.data)) {
      throw new Error("Invalid model list response for openai.");
    }

    const availableModelNames = new Set(
      payload.data.map((model) => String(model.id || "").trim()).filter((modelName) => modelName.length > 0),
    );

    return this.modelRegistry
      .getModelsForProvider("openai")
      .filter((model) => availableModelNames.has(model.name));
  }
}
