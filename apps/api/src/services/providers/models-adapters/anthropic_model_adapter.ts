import type { ModelProviderModel } from "../../model_service.ts";
import type { ModelAdapterInterface } from "./model_adapter_interface.ts";

type AnthropicModelsResponse = {
  data?: Array<{
    id?: string;
    name?: string;
  }>;
};

/**
 * Adapts Anthropic v1/models responses into model metadata used by the API.
 */
export class AnthropicModelAdapter implements ModelAdapterInterface {
  requestHeaders(apiKey: string): Record<string, string> {
    return {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  adapt(payload: unknown): ModelProviderModel[] {
    const response = payload as AnthropicModelsResponse;
    if (!response?.data || !Array.isArray(response.data)) {
      throw new Error("Invalid model list response for anthropic.");
    }

    return response.data.map((model) => {
      const modelName = String(model.id || model.name || "").trim();
      if (!modelName) {
        throw new Error("Model list response for anthropic is missing model ids.");
      }

      return {
        name: modelName,
        reasoningLevels: null,
      };
    });
  }
}
