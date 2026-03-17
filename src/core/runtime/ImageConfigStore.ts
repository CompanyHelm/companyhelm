import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MANAGED_IMAGE_SERVICES, defaultManagedImageReference, type ManagedImageService } from "./ManagedImages.js";

export interface ImageConfig {
  images: Partial<Record<ManagedImageService, string>>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function defaultPackageRoot(): string {
  return path.resolve(__dirname, "../../..");
}

export class ImageConfigStore {
  public constructor(private readonly root: string = defaultPackageRoot()) {}

  public configPath(): string {
    return path.join(this.root, "src", "config", "image_config.ts");
  }

  public load(): ImageConfig {
    const configPath = this.configPath();
    if (!fs.existsSync(configPath)) {
      return { images: {} };
    }

    const images: ImageConfig["images"] = {};
    for (const rawLine of fs.readFileSync(configPath, "utf8").split(/\r?\n/)) {
      const match = rawLine.match(/^\s+(api|frontend):\s+"([^"]+)",?$/);
      if (match) {
        images[match[1] as ManagedImageService] = match[2];
      }
    }

    return { images };
  }

  public setImage(service: ManagedImageService, image: string): { configPath: string; image: string } {
    const nextConfig = this.load();
    nextConfig.images[service] = image;
    this.save(nextConfig);
    return { configPath: this.configPath(), image };
  }

  public save(config: ImageConfig): void {
    const lines = [
      "export const PACKAGED_IMAGE_CONFIG = {",
      ...MANAGED_IMAGE_SERVICES.map((service) => {
        const image = config.images[service] ?? defaultManagedImageReference(service);
        return `  ${service}: "${image}"`;
      }).map((line, index, all) => `${line}${index < all.length - 1 ? "," : ""}`),
      "} as const;",
      ""
    ];

    fs.mkdirSync(path.dirname(this.configPath()), { recursive: true });
    fs.writeFileSync(this.configPath(), lines.join("\n"), "utf8");
  }
}
