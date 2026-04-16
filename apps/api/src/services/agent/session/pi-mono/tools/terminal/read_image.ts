import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import {
  AgentReadImageToolService,
  type AgentReadImageToolResult,
} from "./read_image_service.ts";

/**
 * Reads an image file from the leased environment, prepares a bounded multimodal payload, and
 * returns metadata that lets the agent refer back to the original file path.
 */
export class AgentReadImageTool {
  private static readonly maxResolutionPixels = 4096;

  private static readonly parameters = AgentToolParameterSchema.object({
    detail: Type.Optional(Type.Union([
      Type.Literal("resized"),
      Type.Literal("full"),
    ], {
      description: "Whether to return a resized context-safe image or the full original bytes. Defaults to resized.",
    })),
    path: Type.String({
      description: "Path to the image file inside the leased environment. Any environment directory is allowed.",
    }),
    resolution_h: Type.Optional(Type.Integer({
      description: "Maximum output height in pixels when detail is resized. Defaults to configured read_image default_resolution.height.",
      maximum: AgentReadImageTool.maxResolutionPixels,
      minimum: 1,
    })),
    resolution_w: Type.Optional(Type.Integer({
      description: "Maximum output width in pixels when detail is resized. Defaults to configured read_image default_resolution.width.",
      maximum: AgentReadImageTool.maxResolutionPixels,
      minimum: 1,
    })),
  });

  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly readImageToolService: AgentReadImageToolService;

  constructor(
    promptScope: AgentEnvironmentPromptScope,
    readImageToolService: AgentReadImageToolService,
  ) {
    this.promptScope = promptScope;
    this.readImageToolService = readImageToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentReadImageTool.parameters> {
    return {
      description: "Read an image from the environment filesystem and attach it to model context with metadata.",
      execute: async (_toolCallId, params) => {
        const imageFile = await this.readEnvironmentFile(params.path);
        const preparedImage = await this.readImageToolService.prepareImage({
          data: imageFile.data,
          detail: params.detail ?? "resized",
          path: params.path,
          resolutionHeight: params.resolution_h,
          resolutionWidth: params.resolution_w,
          sourceByteSize: imageFile.byteSize,
        });

        return {
          content: [
            {
              text: this.formatResult(preparedImage),
              type: "text",
            },
            {
              data: preparedImage.base64Image,
              mimeType: preparedImage.outputMimeType,
              type: "image",
            },
          ],
          details: {
            detail: preparedImage.detail,
            inputMimeType: preparedImage.inputMimeType,
            maxReturnBytes: preparedImage.maxReturnBytes,
            maxSourceBytes: preparedImage.maxSourceBytes,
            originalByteSize: preparedImage.originalByteSize,
            originalHeight: preparedImage.originalHeight,
            originalWidth: preparedImage.originalWidth,
            outputByteSize: preparedImage.outputByteSize,
            outputHeight: preparedImage.outputHeight,
            outputMimeType: preparedImage.outputMimeType,
            outputWidth: preparedImage.outputWidth,
            path: preparedImage.path,
            requestedResolutionHeight: preparedImage.requestedResolutionHeight,
            requestedResolutionWidth: preparedImage.requestedResolutionWidth,
            resized: preparedImage.resized,
            type: "read_image",
          },
        };
      },
      label: "read_image",
      name: "read_image",
      parameters: AgentReadImageTool.parameters,
      promptGuidelines: [
        "Use read_image when you need to inspect an image that already exists inside the environment filesystem.",
        "Use detail=\"resized\" by default so image context stays small; use detail=\"full\" only when exact original bytes are necessary.",
        "Use resolution_w and resolution_h to request a smaller resized view before making visual judgments about large images.",
      ],
      promptSnippet: "Read an environment image into model context",
    };
  }

  private async readEnvironmentFile(path: string): Promise<{ byteSize: number; data: Buffer }> {
    const environment = await this.promptScope.getEnvironment();
    const result = await environment.executeBashCommand({
      command: this.buildReadCommand(path),
      timeoutSeconds: 30,
    });

    if (result.exitCode !== 0) {
      throw new Error(`read_image failed to read environment file: ${result.output.trim() || "unknown error"}`);
    }

    try {
      const payload = JSON.parse(result.output.trim()) as { base64: string; byteSize: number };
      if (!Number.isInteger(payload.byteSize) || payload.byteSize < 0 || typeof payload.base64 !== "string") {
        throw new Error("Invalid read_image payload.");
      }
      const data = Buffer.from(payload.base64, "base64");
      if (data.byteLength !== payload.byteSize) {
        throw new Error("Invalid read_image payload byte size.");
      }

      return {
        byteSize: payload.byteSize,
        data,
      };
    } catch (error) {
      throw new Error("read_image failed to parse environment file payload.", {
        cause: error,
      });
    }
  }

  private buildReadCommand(path: string): string {
    const quotedPath = AgentReadImageTool.shellQuote(path);
    return [
      "set -euo pipefail",
      `path=${quotedPath}`,
      "if [ ! -f \"$path\" ]; then",
      "  printf 'read_image: file not found or not a regular file: %s\\n' \"$path\"",
      "  exit 2",
      "fi",
      "byte_size=$(wc -c < \"$path\" | tr -d '[:space:]')",
      `if [ "$byte_size" -gt ${this.readImageToolService.getMaxSourceBytes()} ]; then`,
      "  printf 'read_image: file is %s bytes, above configured max_source_bytes\\n' \"$byte_size\"",
      "  exit 3",
      "fi",
      "printf '{\"byteSize\":%s,\"base64\":\"' \"$byte_size\"",
      "base64 \"$path\" | tr -d '\\n'",
      "printf '\"}\\n'",
    ].join("\n");
  }

  private formatResult(result: AgentReadImageToolResult): string {
    return [
      `path: ${result.path}`,
      `detail: ${result.detail}`,
      `inputMimeType: ${result.inputMimeType}`,
      `outputMimeType: ${result.outputMimeType}`,
      `originalSize: ${result.originalWidth}x${result.originalHeight}`,
      `outputSize: ${result.outputWidth}x${result.outputHeight}`,
      `originalByteSize: ${result.originalByteSize}`,
      `outputByteSize: ${result.outputByteSize}`,
      `resized: ${result.resized ? "true" : "false"}`,
      result.requestedResolutionWidth && result.requestedResolutionHeight
        ? `requestedResolution: ${result.requestedResolutionWidth}x${result.requestedResolutionHeight}`
        : null,
      `maxReturnBytes: ${result.maxReturnBytes}`,
    ].filter((line): line is string => line !== null).join("\n");
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
