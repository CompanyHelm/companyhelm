import { inject, injectable } from "inversify";
import { ModelRegistry } from "../model_registry.ts";
import type { ImageGenerationProviderAdapterInterface, ImageGenerationProviderRequest, ImageGenerationProviderResult } from "./provider_adapter_interface.ts";
import { OpenAiCodexBackendAdapter } from "./openai_codex_backend_adapter.ts";
import { OpenAiImagesApiAdapter } from "./openai_images_api_adapter.ts";
import type { ImageGenerationProviderModel } from "./model.ts";

/**
 * Routes normalized image-generation requests to the provider-specific adapter that matches the
 * selected credential's provider.
 */
@injectable()
export class ImageGenerationProviderService {
  private readonly providerAdapters: Map<string, ImageGenerationProviderAdapterInterface>;

  constructor(@inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry()) {
    this.providerAdapters = new Map<string, ImageGenerationProviderAdapterInterface>([
      ["openai", new OpenAiImagesApiAdapter()],
      ["openai-codex", new OpenAiCodexBackendAdapter(modelRegistry)],
    ]);
  }

  async generateImage(input: {
    apiKey: string;
    baseUrl?: string | null;
    model: ImageGenerationProviderModel;
    request: ImageGenerationProviderRequest;
  }): Promise<ImageGenerationProviderResult> {
    const adapter = this.providerAdapters.get(input.model.provider);
    if (!adapter) {
      throw new Error(`Image generation is not supported for provider ${input.model.provider}.`);
    }

    return adapter.generateImage(input);
  }
}
