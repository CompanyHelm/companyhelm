/**
 * Resizes oversized chat image attachments in the browser before upload so the web client sends
 * the same bounded image shape PI Mono expects without paying the bandwidth and storage cost of
 * the original large file.
 */
export class ChatImageResize {
  private static readonly JPEG_OUTPUT_QUALITY = 0.92;

  private static readonly MAX_HEIGHT = 2000;

  private static readonly MAX_WIDTH = 2000;

  static async toUploadDataUrl(file: File): Promise<string> {
    const image = await ChatImageResize.loadImage(file);
    if (!ChatImageResize.requiresResize(image)) {
      return ChatImageResize.readBlobAsDataUrl(file, file.name);
    }

    const { height, width } = ChatImageResize.resolveTargetDimensions(image);
    const canvas = document.createElement("canvas");
    canvas.height = height;
    canvas.width = width;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(`Failed to resize ${file.name}.`);
    }

    context.drawImage(image, 0, 0, width, height);
    const resizedBlob = await ChatImageResize.canvasToBlob(canvas, file);
    return ChatImageResize.readBlobAsDataUrl(resizedBlob, file.name);
  }

  private static async canvasToBlob(canvas: HTMLCanvasElement, file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(`Failed to resize ${file.name}.`));
            return;
          }

          resolve(blob);
        },
        file.type,
        file.type === "image/jpeg" ? ChatImageResize.JPEG_OUTPUT_QUALITY : undefined,
      );
    });
  }

  private static loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to read ${file.name}.`));
      };
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.src = objectUrl;
    });
  }

  private static readBlobAsDataUrl(file: Blob, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onerror = () => {
        reject(new Error(`Failed to read ${fileName}.`));
      };
      fileReader.onload = () => {
        if (typeof fileReader.result !== "string") {
          reject(new Error(`Failed to read ${fileName}.`));
          return;
        }

        resolve(fileReader.result);
      };
      fileReader.readAsDataURL(file);
    });
  }

  private static requiresResize(image: HTMLImageElement): boolean {
    return image.naturalWidth > ChatImageResize.MAX_WIDTH || image.naturalHeight > ChatImageResize.MAX_HEIGHT;
  }

  private static resolveTargetDimensions(image: HTMLImageElement): { height: number; width: number } {
    const scale = Math.min(
      ChatImageResize.MAX_WIDTH / image.naturalWidth,
      ChatImageResize.MAX_HEIGHT / image.naturalHeight,
    );

    return {
      height: Math.max(1, Math.round(image.naturalHeight * scale)),
      width: Math.max(1, Math.round(image.naturalWidth * scale)),
    };
  }
}
