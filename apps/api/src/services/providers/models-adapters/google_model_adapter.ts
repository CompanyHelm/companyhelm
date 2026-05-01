import { getModels } from "@mariozechner/pi-ai";
import { ModelProviderModel } from "../../ai_providers/model_provider_model.js";
import type { ModelAdapterInterface } from "./model_adapter_interface.ts";

const GEMINI_REASONING_LEVELS = ["minimal", "low", "medium", "high"];

type GoogleModelsResponse = {
  models?: Array<{
    displayName?: string;
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
};

/**
 * Validates official Google Gemini API keys against the public model catalog, then exposes the
 * PI Mono Gemini API models that are both available to the key and suitable for agent execution.
 */
export class GoogleModelAdapter implements ModelAdapterInterface {
  async fetchModels(apiKey: string): Promise<ModelProviderModel[]> {
    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: {
        "x-goog-api-key": normalizedApiKey,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch models for google: ${response.status} ${body}`);
    }

    const payload = await response.json() as GoogleModelsResponse;
    if (!Array.isArray(payload.models)) {
      throw new Error("Invalid model list response for google.");
    }

    const availableModelIds = new Set(
      payload.models
        .filter((model) => model.supportedGenerationMethods?.includes("generateContent") ?? false)
        .map((model) => String(model.name || "").replace(/^models\//, "").trim())
        .filter((modelId) => modelId.length > 0),
    );

    return getModels("google")
      .filter((model) => availableModelIds.has(model.id))
      .map((model) =>
        new ModelProviderModel({
          provider: "google",
          modelId: model.id,
          name: model.name,
          description: model.name,
          reasoningSupported: Boolean(model.reasoning),
          reasoningLevels: model.reasoning ? GEMINI_REASONING_LEVELS : null,
        })
      );
  }
}
