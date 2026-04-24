import { ImageGenerationModelRegistry } from "./model_registry.ts";
import type { ImageGenerationProviderModel } from "./model.ts";
import type { ImageGenerationModelAdapterInterface } from "./model_adapter_interface.ts";

/**
 * Resolves the Codex-backed image generation catalog from CompanyHelm's curated registry instead of
 * calling `/v1/models`, because Codex OAuth tokens do not reliably expose that discovery endpoint.
 */
export class OpenAiCodexImageGenerationModelAdapter implements ImageGenerationModelAdapterInterface {
  private readonly modelRegistry: ImageGenerationModelRegistry;

  constructor(modelRegistry: ImageGenerationModelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  async fetchModels(apiKey: string): Promise<ImageGenerationProviderModel[]> {
    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    return this.modelRegistry.getModelsForProvider("openai-codex");
  }
}
