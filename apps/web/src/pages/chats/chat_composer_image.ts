export type ChatComposerImageDraft = {
  base64EncodedImage: string;
  fileName: string;
  id: string;
  mimeType: string;
};

/**
 * Encodes locally selected chat attachments into the exact base64 payload shape the API persists
 * for PI Mono prompts. It keeps validation close to the browser file boundary so the composer only
 * stores supported JPEG and PNG images.
 */
export class ChatComposerImage {
  private static readonly SUPPORTED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
  ]);

  static async fromFile(file: File): Promise<ChatComposerImageDraft> {
    if (!ChatComposerImage.isSupportedMimeType(file.type)) {
      throw new Error("Only JPEG and PNG images are supported.");
    }

    const dataUrl = await ChatComposerImage.readFileAsDataUrl(file);
    const base64EncodedImage = ChatComposerImage.extractBase64Payload(dataUrl, file.type);
    if (base64EncodedImage.length === 0) {
      throw new Error(`Failed to read ${file.name}.`);
    }

    return {
      base64EncodedImage,
      fileName: file.name,
      id: crypto.randomUUID(),
      mimeType: file.type,
    };
  }

  static isSupportedMimeType(mimeType: string): boolean {
    return ChatComposerImage.SUPPORTED_MIME_TYPES.has(mimeType);
  }

  private static extractBase64Payload(dataUrl: string, mimeType: string): string {
    const prefix = `data:${mimeType};base64,`;
    if (!dataUrl.startsWith(prefix)) {
      throw new Error("Failed to parse the selected image.");
    }

    return dataUrl.slice(prefix.length);
  }

  private static readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onerror = () => {
        reject(new Error(`Failed to read ${file.name}.`));
      };
      fileReader.onload = () => {
        if (typeof fileReader.result !== "string") {
          reject(new Error(`Failed to read ${file.name}.`));
          return;
        }

        resolve(fileReader.result);
      };
      fileReader.readAsDataURL(file);
    });
  }
}
