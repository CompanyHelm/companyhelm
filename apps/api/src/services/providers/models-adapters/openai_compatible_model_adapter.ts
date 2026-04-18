import { ModelProviderModel } from "../../ai_providers/model_provider_model.js";
import type { ModelAdapterFetchOptions, ModelAdapterInterface } from "./model_adapter_interface.ts";

type OpenAiCompatibleModelsResponse = {
  data?: Array<{
    id?: string;
  }>;
};

/**
 * Validates arbitrary OpenAI-compatible credentials against the configured `/models` endpoint and
 * mirrors every returned model id because local/proxy catalogs are not part of CompanyHelm's
 * curated provider registry.
 */
export class OpenAiCompatibleModelAdapter implements ModelAdapterInterface {
  async fetchModels(apiKey: string, options: ModelAdapterFetchOptions = {}): Promise<ModelProviderModel[]> {
    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    const baseUrl = OpenAiCompatibleModelAdapter.resolveBaseUrl(options.baseUrl);
    const response = await fetch(new URL("models", baseUrl).toString(), {
      headers: {
        Authorization: `Bearer ${normalizedApiKey}`,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch models for openai-compatible: ${response.status} ${body}`);
    }

    const payload = await response.json() as OpenAiCompatibleModelsResponse;
    if (!Array.isArray(payload.data)) {
      throw new Error("Invalid model list response for openai-compatible.");
    }

    return payload.data
      .map((model) => String(model.id || "").trim())
      .filter((modelId) => modelId.length > 0)
      .map((modelId) =>
        new ModelProviderModel({
          provider: "openai-compatible",
          modelId,
          name: modelId,
          description: `OpenAI-compatible model: ${modelId}`,
          reasoningSupported: false,
          reasoningLevels: null,
        })
      );
  }

  private static resolveBaseUrl(rawBaseUrl: string | null | undefined): string {
    const normalizedBaseUrl = String(rawBaseUrl || "").trim();
    if (!normalizedBaseUrl) {
      throw new Error("baseUrl is required for OpenAI-compatible providers.");
    }

    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(normalizedBaseUrl);
    } catch {
      throw new Error("baseUrl must be a valid HTTP(S) URL.");
    }
    if (parsedBaseUrl.protocol !== "http:" && parsedBaseUrl.protocol !== "https:") {
      throw new Error("baseUrl must be a valid HTTP(S) URL.");
    }

    return normalizedBaseUrl.endsWith("/") ? normalizedBaseUrl : `${normalizedBaseUrl}/`;
  }
}
