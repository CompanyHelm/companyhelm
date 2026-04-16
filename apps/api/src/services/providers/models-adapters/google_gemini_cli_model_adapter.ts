import { getModels } from "@mariozechner/pi-ai";
import { ModelProviderModel } from "../../ai_providers/model_provider_model.js";
import type { ModelAdapterInterface } from "./model_adapter_interface.ts";

const GEMINI_REASONING_LEVELS = ["minimal", "low", "medium", "high"];

/**
 * Resolves the Gemini CLI catalog from PI's built-in Cloud Code Assist model registry. Gemini CLI
 * OAuth credentials include a Google project id, so this adapter validates the stored runtime key
 * shape before surfacing models that would otherwise fail only when an agent session starts.
 */
export class GoogleGeminiCliModelAdapter implements ModelAdapterInterface {
  async fetchModels(apiKey: string): Promise<ModelProviderModel[]> {
    GoogleGeminiCliModelAdapter.assertRuntimeApiKey(apiKey);

    return getModels("google-gemini-cli").map((model) =>
      new ModelProviderModel({
        provider: "google-gemini-cli",
        modelId: model.id,
        name: model.name,
        description: model.name,
        reasoningSupported: Boolean(model.reasoning),
        reasoningLevels: model.reasoning ? GEMINI_REASONING_LEVELS : null,
      })
    );
  }

  private static assertRuntimeApiKey(apiKey: string): void {
    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    let parsedApiKey: unknown;
    try {
      parsedApiKey = JSON.parse(normalizedApiKey);
    } catch {
      throw new Error("Google Gemini CLI credentials must include a JSON token and projectId.");
    }

    if (!this.isRecord(parsedApiKey)) {
      throw new Error("Google Gemini CLI credentials must include a JSON token and projectId.");
    }

    const token = String(parsedApiKey.token || "").trim();
    const projectId = String(parsedApiKey.projectId || "").trim();
    if (!token || !projectId) {
      throw new Error("Google Gemini CLI credentials must include a token and projectId.");
    }
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
