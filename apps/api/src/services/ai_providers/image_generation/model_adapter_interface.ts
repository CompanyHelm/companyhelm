import type { ImageGenerationProviderModel } from "./model.ts";

export type ImageGenerationModelAdapterFetchOptions = {
  baseUrl?: string | null;
};

/**
 * Defines how one provider proves access to image generation and returns the normalized models
 * that CompanyHelm should persist for one credential.
 */
export interface ImageGenerationModelAdapterInterface {
  /**
   * Fetches the provider-visible image generation models for one credential.
   */
  fetchModels(
    apiKey: string,
    options?: ImageGenerationModelAdapterFetchOptions,
  ): Promise<ImageGenerationProviderModel[]>;
}
