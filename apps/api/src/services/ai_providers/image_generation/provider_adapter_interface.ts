import type { ImageGenerationProviderModel } from "./model.ts";

export type ImageGenerationProviderRequest = {
  background?: "auto" | "opaque" | "transparent";
  outputFormat?: "jpeg" | "png" | "webp";
  prompt: string;
  quality?: "auto" | "high" | "low" | "medium";
  size?: string;
};

export type ImageGenerationProviderResult = {
  base64Image: string;
  mimeType: string;
  providerId: string;
  revisedPrompt: string | null;
};

/**
 * Defines how one provider turns a normalized image-generation request into a normalized result.
 */
export interface ImageGenerationProviderAdapterInterface {
  /**
   * Generates one image with the given credential and normalized image model configuration.
   */
  generateImage(input: {
    apiKey: string;
    baseUrl?: string | null;
    model: ImageGenerationProviderModel;
    request: ImageGenerationProviderRequest;
  }): Promise<ImageGenerationProviderResult>;
}
