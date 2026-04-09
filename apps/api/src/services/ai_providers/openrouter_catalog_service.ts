import { getModels } from "@mariozechner/pi-ai";
import { injectable } from "inversify";

export type OpenRouterCatalogModel = {
  contextWindow: number;
  cost: {
    cacheRead: number;
    cacheWrite: number;
    input: number;
    output: number;
  };
  description: string;
  input: Array<"image" | "text">;
  maxTokens: number;
  modelId: string;
  name: string;
  reasoningSupported: boolean;
};

type OpenRouterCatalogResponse = {
  data?: OpenRouterRemoteModel[];
};

type OpenRouterRemoteModel = {
  context_length?: number;
  description?: string;
  id?: string;
  name?: string;
  supported_parameters?: string[];
  architecture?: {
    input_modalities?: string[];
  };
  pricing?: {
    completion?: string;
    input_cache_read?: string;
    input_cache_write?: string;
    prompt?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
};

/**
 * Fetches the OpenRouter catalog in a form that both CompanyHelm persistence and the PI runtime
 * can reuse. It validates API keys via OpenRouter's key endpoint because the public models catalog
 * is readable without authentication and would otherwise accept invalid credentials silently.
 */
@injectable()
export class OpenRouterCatalogService {
  static readonly API_BASE_URL = "https://openrouter.ai/api/v1";

  async fetchCatalog(
    apiKey: string,
    input: {
      validateCredential?: boolean;
    } = {},
  ): Promise<OpenRouterCatalogModel[]> {
    const normalizedApiKey = String(apiKey || "").trim();
    if (!normalizedApiKey) {
      throw new Error("Model provider API key is required.");
    }

    if (input.validateCredential !== false) {
      await this.validateApiKey(normalizedApiKey);
    }

    const response = await fetch(`${OpenRouterCatalogService.API_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${normalizedApiKey}`,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch models for openrouter: ${response.status} ${body}`);
    }

    const payload = await response.json() as OpenRouterCatalogResponse;
    if (!Array.isArray(payload.data)) {
      throw new Error("Invalid model list response for openrouter.");
    }

    const reasoningSupportByModelId = this.buildReasoningSupportIndex();

    return payload.data
      .map((model) => this.toCatalogModel(model, reasoningSupportByModelId))
      .filter((model): model is OpenRouterCatalogModel => model !== null);
  }

  private async validateApiKey(apiKey: string): Promise<void> {
    const response = await fetch(`${OpenRouterCatalogService.API_BASE_URL}/key`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (response.ok) {
      return;
    }

    const body = await response.text();
    throw new Error(`Failed to validate openrouter API key: ${response.status} ${body}`);
  }

  private toCatalogModel(
    model: OpenRouterRemoteModel,
    reasoningSupportByModelId: Map<string, boolean>,
  ): OpenRouterCatalogModel | null {
    const modelId = typeof model.id === "string" ? model.id.trim() : "";
    const name = typeof model.name === "string" ? model.name.trim() : "";
    if (!modelId || !name) {
      return null;
    }

    const inputModalities = Array.isArray(model.architecture?.input_modalities)
      ? model.architecture?.input_modalities
      : [];
    const input: Array<"image" | "text"> = [];
    if (inputModalities.includes("text")) {
      input.push("text");
    }
    if (inputModalities.includes("image")) {
      input.push("image");
    }

    return {
      contextWindow: Number(model.top_provider?.context_length ?? model.context_length) || 128000,
      cost: {
        cacheRead: this.parsePricingValue(model.pricing?.input_cache_read),
        cacheWrite: this.parsePricingValue(model.pricing?.input_cache_write),
        input: this.parsePricingValue(model.pricing?.prompt),
        output: this.parsePricingValue(model.pricing?.completion),
      },
      description: typeof model.description === "string" && model.description.length > 0
        ? model.description
        : name,
      input: input.length > 0 ? input : ["text"],
      maxTokens: Number(model.top_provider?.max_completion_tokens) || 16384,
      modelId,
      name,
      reasoningSupported: reasoningSupportByModelId.get(modelId) ?? false,
    };
  }

  /**
   * PI's OpenRouter catalog only exposes whether reasoning is supported at all, not a per-model
   * list of selectable effort levels. We mirror that capability bit and leave exact levels unset.
   */
  protected buildReasoningSupportIndex(): Map<string, boolean> {
    return new Map(
      getModels("openrouter").map((model) => [model.id, Boolean(model.reasoning)]),
    );
  }

  private parsePricingValue(value: string | undefined): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }
}
