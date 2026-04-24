import { injectable } from "inversify";
import { ImageGenerationProviderModel } from "./model.ts";

/**
 * Owns the curated image-generation catalog that CompanyHelm knows how to expose. Provider APIs do
 * not consistently publish the capability metadata needed by the product, so this registry remains
 * the canonical source for names, descriptions, and supported options.
 */
@injectable()
export class ImageGenerationModelRegistry {
  private static readonly defaultModels: Record<string, string> = {
    openai: "gpt-image-2",
    "openai-codex": "gpt-image-2",
  };

  private readonly models: ImageGenerationProviderModel[] = [
    new ImageGenerationProviderModel({
      description: "ChatGPT Images 2.0 via the OpenAI Images API.",
      modelId: "gpt-image-2",
      name: "ChatGPT Images 2.0",
      outputMimeTypes: ["image/png", "image/jpeg", "image/webp"],
      provider: "openai",
      supportedQualities: ["low", "medium", "high", "auto"],
      supportedSizes: ["auto"],
      supportsEditing: true,
      supportsFlexibleSizes: true,
      supportsTransparentBackground: false,
    }),
    new ImageGenerationProviderModel({
      description: "ChatGPT Images 2.0 via OpenAI's Codex backend image-generation tool.",
      modelId: "gpt-image-2",
      name: "ChatGPT Images 2.0",
      outputMimeTypes: ["image/png", "image/jpeg", "image/webp"],
      provider: "openai-codex",
      supportedQualities: ["low", "medium", "high", "auto"],
      supportedSizes: ["auto"],
      supportsEditing: true,
      supportsFlexibleSizes: true,
      supportsTransparentBackground: false,
    }),
  ];

  getDefaultModelForProvider(provider: string): string | null {
    return ImageGenerationModelRegistry.defaultModels[String(provider || "").trim()] ?? null;
  }

  /**
   * Returns the curated models for one provider while preserving explicit order so downstream
   * persistence and UI rendering stay deterministic.
   */
  getModelsForProvider(provider: string): ImageGenerationProviderModel[] {
    const normalizedProvider = String(provider || "").trim();
    if (!normalizedProvider) {
      throw new Error("Image generation provider is required.");
    }

    return this.models.filter((model) => model.provider === normalizedProvider);
  }
}
