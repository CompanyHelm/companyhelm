import { fileTypeFromBuffer } from "file-type";
import {
  PhotonImage,
  resize,
  SamplingFilter,
} from "@silvia-odwyer/photon-node";

export type AgentReadImageDetail = "full" | "resized";

export type AgentReadImageToolConfig = {
  defaultResolutionHeight: number;
  defaultResolutionWidth: number;
  maxReturnBytes: number;
  maxSourceBytes: number;
};

export type AgentReadImageToolInput = {
  data: Buffer;
  detail: AgentReadImageDetail;
  path: string;
  resolutionHeight?: number | null;
  resolutionWidth?: number | null;
  sourceByteSize: number;
};

export type AgentReadImageToolResult = {
  base64Image: string;
  detail: AgentReadImageDetail;
  inputMimeType: string;
  maxReturnBytes: number;
  maxSourceBytes: number;
  originalByteSize: number;
  originalHeight: number;
  originalWidth: number;
  outputByteSize: number;
  outputHeight: number;
  outputMimeType: string;
  outputWidth: number;
  path: string;
  requestedResolutionHeight: number | null;
  requestedResolutionWidth: number | null;
  resized: boolean;
};

type ImageSize = {
  height: number;
  width: number;
};

type EncodedImage = {
  data: Buffer;
  height: number;
  mimeType: string;
  resized: boolean;
  width: number;
};

/**
 * Prepares environment image files for model context. It treats the on-disk file as immutable,
 * verifies image type from magic bytes, and creates a bounded inline payload for PI Mono.
 */
export class AgentReadImageToolService {
  private static readonly resizedOutputMimeType = "image/jpeg";
  private static readonly resizedJpegQuality = 85;
  private static readonly minimumResizedEdgePixels = 64;

  private readonly config: AgentReadImageToolConfig;

  constructor(config: AgentReadImageToolConfig) {
    this.config = config;
  }

  getMaxSourceBytes(): number {
    return this.config.maxSourceBytes;
  }

  async prepareImage(input: AgentReadImageToolInput): Promise<AgentReadImageToolResult> {
    if (input.sourceByteSize > this.config.maxSourceBytes) {
      throw new Error(`Image source is ${input.sourceByteSize} bytes, which exceeds the configured read_image max_source_bytes of ${this.config.maxSourceBytes}.`);
    }

    const inputMimeType = await this.detectImageMimeType(input.data);
    const originalImage = this.decodeImage(input.data);
    try {
      const originalSize = this.getImageSize(originalImage);
      const requestedResolution = input.detail === "resized"
        ? this.resolveRequestedResolution(input.resolutionWidth, input.resolutionHeight)
        : null;
      const encodedImage = input.detail === "full"
        ? this.prepareFullImage(input.data, originalSize, inputMimeType)
        : this.prepareResizedImage(input.data, inputMimeType, originalImage, originalSize, requestedResolution as ImageSize);

      return {
        base64Image: encodedImage.data.toString("base64"),
        detail: input.detail,
        inputMimeType,
        maxReturnBytes: this.config.maxReturnBytes,
        maxSourceBytes: this.config.maxSourceBytes,
        originalByteSize: input.sourceByteSize,
        originalHeight: originalSize.height,
        originalWidth: originalSize.width,
        outputByteSize: encodedImage.data.byteLength,
        outputHeight: encodedImage.height,
        outputMimeType: encodedImage.mimeType,
        outputWidth: encodedImage.width,
        path: input.path,
        requestedResolutionHeight: requestedResolution?.height ?? null,
        requestedResolutionWidth: requestedResolution?.width ?? null,
        resized: encodedImage.resized,
      };
    } finally {
      originalImage.free();
    }
  }

  private async detectImageMimeType(data: Buffer): Promise<string> {
    const detectedType = await fileTypeFromBuffer(data);
    if (!detectedType?.mime.startsWith("image/")) {
      throw new Error("read_image only supports files whose MIME type can be detected as an image from magic bytes.");
    }

    return detectedType.mime;
  }

  private decodeImage(data: Buffer): PhotonImage {
    try {
      return PhotonImage.new_from_byteslice(new Uint8Array(data));
    } catch (error) {
      throw new Error("read_image could not decode the image bytes.", {
        cause: error,
      });
    }
  }

  private getImageSize(image: PhotonImage): ImageSize {
    return {
      height: image.get_height(),
      width: image.get_width(),
    };
  }

  private prepareFullImage(data: Buffer, originalSize: ImageSize, inputMimeType: string): EncodedImage {
    if (data.byteLength > this.config.maxReturnBytes) {
      throw new Error(`Full image output is ${data.byteLength} bytes, which exceeds the configured read_image max_return_bytes of ${this.config.maxReturnBytes}. Use detail="resized" or request a smaller image.`);
    }

    return {
      data,
      height: originalSize.height,
      mimeType: inputMimeType,
      resized: false,
      width: originalSize.width,
    };
  }

  private prepareResizedImage(
    originalData: Buffer,
    inputMimeType: string,
    originalImage: PhotonImage,
    originalSize: ImageSize,
    requestedResolution: ImageSize,
  ): EncodedImage {
    if (
      originalData.byteLength <= this.config.maxReturnBytes
      && originalSize.width <= requestedResolution.width
      && originalSize.height <= requestedResolution.height
    ) {
      return {
        data: originalData,
        height: originalSize.height,
        mimeType: inputMimeType,
        resized: false,
        width: originalSize.width,
      };
    }

    let targetSize = this.fitWithin(originalSize, requestedResolution);
    for (let attempt = 0; attempt < 8; attempt++) {
      const output = this.encodeResizedJpeg(originalImage, targetSize);
      if (output.data.byteLength <= this.config.maxReturnBytes) {
        return output;
      }

      targetSize = this.reduceSizeForByteLimit(targetSize, output.data.byteLength);
    }

    throw new Error(`Resized image still exceeds the configured read_image max_return_bytes of ${this.config.maxReturnBytes}. Request a smaller resolution.`);
  }

  private encodeResizedJpeg(originalImage: PhotonImage, targetSize: ImageSize): EncodedImage {
    const resizedImage = resize(originalImage, targetSize.width, targetSize.height, SamplingFilter.Lanczos3);
    try {
      return {
        data: Buffer.from(resizedImage.get_bytes_jpeg(AgentReadImageToolService.resizedJpegQuality)),
        height: targetSize.height,
        mimeType: AgentReadImageToolService.resizedOutputMimeType,
        resized: true,
        width: targetSize.width,
      };
    } finally {
      resizedImage.free();
    }
  }

  private fitWithin(originalSize: ImageSize, requestedResolution: ImageSize): ImageSize {
    const scale = Math.min(
      1,
      requestedResolution.width / originalSize.width,
      requestedResolution.height / originalSize.height,
    );

    return {
      height: Math.max(1, Math.floor(originalSize.height * scale)),
      width: Math.max(1, Math.floor(originalSize.width * scale)),
    };
  }

  private reduceSizeForByteLimit(size: ImageSize, outputByteSize: number): ImageSize {
    const scale = Math.max(
      0.5,
      Math.sqrt(this.config.maxReturnBytes / outputByteSize) * 0.9,
    );

    return {
      height: Math.max(AgentReadImageToolService.minimumResizedEdgePixels, Math.floor(size.height * scale)),
      width: Math.max(AgentReadImageToolService.minimumResizedEdgePixels, Math.floor(size.width * scale)),
    };
  }

  private resolveRequestedResolution(
    width: number | null | undefined,
    height: number | null | undefined,
  ): ImageSize {
    return {
      height: this.resolvePositiveInteger(height, this.config.defaultResolutionHeight, "resolution_h"),
      width: this.resolvePositiveInteger(width, this.config.defaultResolutionWidth, "resolution_w"),
    };
  }

  private resolvePositiveInteger(value: number | null | undefined, fallback: number, label: string): number {
    const resolvedValue = value ?? fallback;
    if (!Number.isInteger(resolvedValue) || resolvedValue < 1) {
      throw new Error(`${label} must be a positive integer.`);
    }

    return resolvedValue;
  }
}
