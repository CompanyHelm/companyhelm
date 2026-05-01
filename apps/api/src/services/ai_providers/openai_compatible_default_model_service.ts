import { injectable } from "inversify";

type OpenAiCompatibleDefaultModelInput = {
  baseUrl?: string | null;
  modelIds: string[];
  modelProvider: string;
};

/**
 * Selects vendor-specific defaults for OpenAI-compatible endpoints. These providers all share the
 * same backend provider id, so the endpoint URL is the only stable signal available when deciding
 * whether a fetched model list has a preferred default beyond the generic first-model fallback.
 */
@injectable()
export class OpenAiCompatibleDefaultModelService {
  private static readonly defaultModelIdsByBaseUrl = new Map<string, string>([
    ["https://integrate.api.nvidia.com/v1", "deepseek-ai/deepseek-v4-pro"],
  ]);

  resolveDefaultModelId(input: OpenAiCompatibleDefaultModelInput): string | null {
    if (input.modelProvider !== "openai-compatible") {
      return null;
    }

    const defaultModelId = this.resolveDefaultModelIdForBaseUrl(input.baseUrl);
    if (!defaultModelId || !input.modelIds.includes(defaultModelId)) {
      return null;
    }

    return defaultModelId;
  }

  private resolveDefaultModelIdForBaseUrl(rawBaseUrl: string | null | undefined): string | null {
    const baseUrl = this.resolveComparableBaseUrl(rawBaseUrl);
    if (!baseUrl) {
      return null;
    }

    return OpenAiCompatibleDefaultModelService.defaultModelIdsByBaseUrl.get(baseUrl) ?? null;
  }

  private resolveComparableBaseUrl(rawBaseUrl: string | null | undefined): string | null {
    const baseUrl = String(rawBaseUrl || "").trim();
    if (!baseUrl) {
      return null;
    }

    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  }
}
