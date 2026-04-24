import { ModelRegistry } from "../model_registry.ts";
import type { ImageGenerationProviderAdapterInterface, ImageGenerationProviderResult } from "./provider_adapter_interface.ts";
import type { ImageGenerationProviderModel } from "./model.ts";

type OpenAiResponsesResponse = {
  output?: Array<{
    result?: string;
    revised_prompt?: string;
    type?: string;
  }>;
};

/**
 * Calls the OpenAI Responses API image-generation tool for Codex-backend credentials. The assigned
 * image model still selects the CompanyHelm-facing configuration, while the request itself uses the
 * provider's built-in image tool path and the provider's default text model.
 */
export class OpenAiCodexBackendAdapter implements ImageGenerationProviderAdapterInterface {
  private readonly modelRegistry: ModelRegistry;

  constructor(modelRegistry: ModelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  async generateImage(input: {
    apiKey: string;
    baseUrl?: string | null;
    model: ImageGenerationProviderModel;
    request: {
      background?: "auto" | "opaque" | "transparent";
      outputFormat?: "jpeg" | "png" | "webp";
      prompt: string;
      quality?: "auto" | "high" | "low" | "medium";
      size?: string;
    };
  }): Promise<ImageGenerationProviderResult> {
    const response = await fetch(`${String(input.baseUrl || "https://api.openai.com").replace(/\/$/u, "")}/v1/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${String(input.apiKey || "").trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: input.request.prompt,
        model: this.modelRegistry.getDefaultModelForProvider(input.model.provider) ?? "gpt-5.4",
        tools: [{
          background: input.request.background,
          output_format: input.request.outputFormat ?? "png",
          quality: input.request.quality,
          size: input.request.size,
          type: "image_generation",
        }],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI Codex image generation failed: ${response.status} ${body}`);
    }

    const payload = await response.json() as OpenAiResponsesResponse;
    const imageCall = payload.output?.find((item) => item.type === "image_generation_call") ?? null;
    if (!imageCall?.result) {
      throw new Error("OpenAI Codex image generation did not return image bytes.");
    }

    return {
      base64Image: imageCall.result,
      mimeType: OpenAiCodexBackendAdapter.resolveMimeType(input.request.outputFormat ?? "png"),
      providerId: input.model.provider,
      revisedPrompt: imageCall.revised_prompt ?? null,
    };
  }

  private static resolveMimeType(outputFormat: "jpeg" | "png" | "webp"): string {
    if (outputFormat === "jpeg") {
      return "image/jpeg";
    }
    if (outputFormat === "webp") {
      return "image/webp";
    }
    return "image/png";
  }
}
