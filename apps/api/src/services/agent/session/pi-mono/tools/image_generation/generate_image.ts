import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentImageGenerationToolService } from "./service.ts";

/**
 * Generates one image with the agent's assigned default image model and returns the resulting bytes
 * as PI Mono multimodal content.
 */
export class AgentGenerateImageTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    background: Type.Optional(Type.Union([Type.Literal("auto"), Type.Literal("opaque"), Type.Literal("transparent")])) ,
    output_format: Type.Optional(Type.Union([Type.Literal("jpeg"), Type.Literal("png"), Type.Literal("webp")])) ,
    prompt: Type.String({ description: "Image generation prompt.", minLength: 1 }),
    quality: Type.Optional(Type.Union([Type.Literal("auto"), Type.Literal("high"), Type.Literal("low"), Type.Literal("medium")])) ,
    size: Type.Optional(Type.String({ description: "Image size hint such as auto or WIDTHxHEIGHT." })),
  });

  private readonly imageGenerationToolService: AgentImageGenerationToolService;

  constructor(imageGenerationToolService: AgentImageGenerationToolService) {
    this.imageGenerationToolService = imageGenerationToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentGenerateImageTool.parameters> {
    return {
      description: "Generate an image using the agent's assigned image model.",
      execute: async (_toolCallId, params) => {
        const result = await this.imageGenerationToolService.generateImage({
          background: params.background,
          outputFormat: params.output_format,
          prompt: params.prompt,
          quality: params.quality,
          size: params.size,
        });

        return {
          content: [
            {
              text: [
                `provider: ${result.providerId}`,
                `modelId: ${result.modelId}`,
                `modelName: ${result.modelName}`,
                result.revisedPrompt ? `revisedPrompt: ${result.revisedPrompt}` : null,
              ].filter((line): line is string => line !== null).join("\n"),
              type: "text",
            },
            { data: result.base64Image, mimeType: result.mimeType, type: "image" },
          ],
          details: {
            mimeType: result.mimeType,
            modelId: result.modelId,
            modelName: result.modelName,
            providerId: result.providerId,
            revisedPrompt: result.revisedPrompt,
            type: "generate_image",
          },
        };
      },
      label: "generate_image",
      name: "generate_image",
      parameters: AgentGenerateImageTool.parameters,
      promptGuidelines: [
        "Use generate_image when the user needs a brand-new image asset or mockup.",
        "Do not use generate_image when the user only needs to inspect an existing image; use read_image instead.",
      ],
      promptSnippet: "Generate an image with the configured provider image model",
    };
  }
}
