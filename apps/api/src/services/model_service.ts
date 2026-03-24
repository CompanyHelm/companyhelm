import { injectable } from "inversify";
import { AnthropicModelAdapter } from "./providers/models-adapters/anthropic_model_adapter.ts";
import type { ModelAdapterInterface } from "./providers/models-adapters/model_adapter_interface.ts";
import { OpenAiModelAdapter } from "./providers/models-adapters/openai_model_adapter.ts";

export type ModelProviderModel = {
  name: string;
  reasoningLevels: string[] | null;
};

/**
 * Fetches model metadata for supported providers using their public APIs.
 */
@injectable()
export class ModelService {
  private readonly providerUrls = new Map<string, string>([
    ["openai", "https://api.openai.com/v1/models"],
    ["anthropic", "https://api.anthropic.com/v1/models"],
  ]);
  private readonly providerAdapters = new Map<string, ModelAdapterInterface>([
    ["openai", new OpenAiModelAdapter()],
    ["anthropic", new AnthropicModelAdapter()],
  ]);

  async fetchModels(modelProvider: string, apiKey: string): Promise<ModelProviderModel[]> {
    const normalizedProvider = String(modelProvider || "").trim();
    if (!normalizedProvider) {
      throw new Error("Model provider is required.");
    }

    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    const url = this.providerUrls.get(normalizedProvider);
    const adapter = this.providerAdapters.get(normalizedProvider);
    if (!url || !adapter) {
      throw new Error(`Unsupported model provider: ${normalizedProvider}`);
    }

    const response = await fetch(url, {
      headers: {
        ...adapter.requestHeaders(normalizedApiKey),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch models for ${normalizedProvider}: ${response.status} ${body}`);
    }

    const payload = (await response.json()) as unknown;

    return adapter.adapt(payload);
  }

}
