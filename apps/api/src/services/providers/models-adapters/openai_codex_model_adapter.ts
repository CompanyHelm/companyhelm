import { getModels } from "@mariozechner/pi-ai";
import { ModelRegistry } from "../../ai_providers/model_registry.js";
import { ModelProviderModel } from "../../ai_providers/model_provider_model.js";
import type { ModelAdapterInterface } from "./model_adapter_interface.ts";

const OPENAI_REASONING_LEVELS = ["low", "medium", "high", "xhigh"];

/**
 * Resolves the OpenAI Codex catalog from PI's built-in model registry instead of calling OpenAI's
 * public model discovery endpoint, because Codex OAuth tokens are used for ChatGPT backend access
 * and do not carry the `api.model.read` scope required by `/v1/models`.
 */
export class OpenAiCodexModelAdapter implements ModelAdapterInterface {
  private readonly modelRegistry: ModelRegistry;

  constructor(modelRegistry: ModelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  async fetchModels(apiKey: string): Promise<ModelProviderModel[]> {
    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    const curatedOpenAiModels = new Map(
      this.modelRegistry.getModelsForProvider("openai").map((model) => [model.modelId, model]),
    );

    return getModels("openai-codex").map((model) => {
      const curatedModel = curatedOpenAiModels.get(model.id);
      return new ModelProviderModel({
        provider: "openai-codex",
        modelId: model.id,
        name: model.name,
        description: curatedModel?.description ?? model.name,
        reasoningSupported: Boolean(model.reasoning),
        reasoningLevels: model.reasoning ? curatedModel?.reasoningLevels ?? OPENAI_REASONING_LEVELS : null,
      });
    });
  }
}
