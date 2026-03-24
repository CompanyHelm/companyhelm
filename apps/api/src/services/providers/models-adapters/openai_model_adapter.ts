import type { ModelProviderModel } from "../../model_service.ts";
import type { ModelAdapterInterface } from "./model_adapter_interface.ts";

type OpenAiModelsResponse = {
  data?: Array<{
    id?: string;
    reasoning?: {
      levels?: string[];
    };
  }>;
};

/**
 * Adapts OpenAI v1/models responses into model metadata used by the API.
 */
export class OpenAiModelAdapter implements ModelAdapterInterface {
  requestHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }

  adapt(payload: unknown): ModelProviderModel[] {
    const response = payload as OpenAiModelsResponse;
    if (!response?.data || !Array.isArray(response.data)) {
      throw new Error("Invalid model list response for openai.");
    }

    return response.data.map((model) => {
      const modelName = String(model.id || "").trim();
      if (!modelName) {
        throw new Error("Model list response for openai is missing model ids.");
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
