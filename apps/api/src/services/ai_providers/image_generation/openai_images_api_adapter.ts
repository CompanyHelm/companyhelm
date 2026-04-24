import type { ImageGenerationProviderAdapterInterface, ImageGenerationProviderResult } from "./provider_adapter_interface.ts";
import type { ImageGenerationProviderModel } from "./model.ts";

type OpenAiImagesGenerateResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
};

/**
 * Calls OpenAI's Images API for API-key-backed image generation credentials and normalizes the
 * first returned image into CompanyHelm's multimodal tool result shape.
 */
export class OpenAiImagesApiAdapter implements ImageGenerationProviderAdapterInterface {
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
    const response = await fetch(`${String(input.baseUrl || "https://api.openai.com").replace(/\/$/u, "")}/v1/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${String(input.apiKey || "").trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        background: input.request.background,
        model: input.model.modelId,
        output_format: input.request.outputFormat ?? "png",
        prompt: input.request.prompt,
        quality: input.request.quality,
        size: input.request.size,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI image generation failed: ${response.status} ${body}`);
    }

    const payload = await response.json() as OpenAiImagesGenerateResponse;
    const base64Image = payload.data?.[0]?.b64_json;
    if (typeof base64Image !== "string" || base64Image.length === 0) {
      throw new Error("OpenAI image generation did not return image bytes.");
    }

    return {
      base64Image,
      mimeType: OpenAiImagesApiAdapter.resolveMimeType(input.request.outputFormat ?? "png"),
      providerId: input.model.provider,
      revisedPrompt: null,
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
