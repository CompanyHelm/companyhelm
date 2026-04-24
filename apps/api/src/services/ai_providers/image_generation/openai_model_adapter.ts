import { ImageGenerationModelRegistry } from "./model_registry.ts";
import type { ImageGenerationProviderModel } from "./model.ts";
import type { ImageGenerationModelAdapterInterface } from "./model_adapter_interface.ts";

type OpenAiModelsResponse = {
  data?: Array<{
    id?: string;
  }>;
};

/**
 * Validates OpenAI API-key credentials against `/v1/models`, then keeps only the curated image
 * generation entries that the provider reports as visible to that key.
 */
export class OpenAiImageGenerationModelAdapter implements ImageGenerationModelAdapterInterface {
  private readonly modelRegistry: ImageGenerationModelRegistry;

  constructor(modelRegistry: ImageGenerationModelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  async fetchModels(apiKey: string): Promise<ImageGenerationProviderModel[]> {
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
      throw new Error(`Failed to fetch image generation models for openai: ${response.status} ${body}`);
    }

    const payload = await response.json() as OpenAiModelsResponse;
    if (!Array.isArray(payload.data)) {
      throw new Error("Invalid model list response for openai image generation.");
    }

    const visibleModelIds = new Set(
      payload.data.map((model) => String(model.id || "").trim()).filter((modelId) => modelId.length > 0),
    );

    return this.modelRegistry
      .getModelsForProvider("openai")
      .filter((model) => visibleModelIds.has(model.modelId));
  }
}
