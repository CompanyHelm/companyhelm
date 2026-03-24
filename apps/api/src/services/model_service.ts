import { injectable } from "inversify";

export type ModelProviderModel = {
  name: string;
  reasoningLevels: string[] | null;
};

type OpenAiModelsResponse = {
  data?: Array<{
    id?: string;
    reasoning?: {
      levels?: string[];
    };
  }>;
};

/**
 * Fetches model metadata for supported providers using their public APIs.
 */
@injectable()
export class ModelService {
  private readonly providerUrls = new Map<string, string>([
    ["openai", "https://api.openai.com/v1/models"],
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
    if (!url) {
      throw new Error(`Unsupported model provider: ${normalizedProvider}`);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${normalizedApiKey}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch models for ${normalizedProvider}: ${response.status} ${body}`);
    }

    const payload = (await response.json()) as OpenAiModelsResponse;
    if (!payload?.data || !Array.isArray(payload.data)) {
      throw new Error(`Invalid model list response for ${normalizedProvider}.`);
    }

    return payload.data.map((model) => {
      const modelName = String(model.id || "").trim();
      if (!modelName) {
        throw new Error(`Model list response for ${normalizedProvider} is missing model ids.`);
      }

      const reasoningLevels = Array.isArray(model.reasoning?.levels)
        ? model.reasoning?.levels.map((level) => String(level))
        : null;

      return {
        name: modelName,
        reasoningLevels: reasoningLevels && reasoningLevels.length > 0 ? reasoningLevels : null,
      };
    });
  }
}
