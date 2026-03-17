import fs from "node:fs";
import path from "node:path";

import type { ManagedImageService } from "./ManagedImages.js";

export interface RepoConfig {
  images: Partial<Record<ManagedImageService, string>>;
}

function defaultRepoConfigRoot(): string {
  return process.cwd();
}

export class RepoConfigStore {
  public constructor(private readonly root: string = defaultRepoConfigRoot()) {}

  public configPath(): string {
    return path.join(this.root, "config.yaml");
  }

  public load(): RepoConfig {
    const configPath = this.configPath();
    if (!fs.existsSync(configPath)) {
      return { images: {} };
    }

    return this.parse(fs.readFileSync(configPath, "utf8"));
  }

  public setImage(service: ManagedImageService, image: string): { configPath: string; image: string } {
    const nextConfig = this.load();
    nextConfig.images[service] = image;
    this.save(nextConfig);
    return { configPath: this.configPath(), image };
  }

  public save(config: RepoConfig): void {
    const lines: string[] = ["images:"];
    if (config.images.api) {
      lines.push(`  api: ${config.images.api}`);
    }
    if (config.images.frontend) {
      lines.push(`  frontend: ${config.images.frontend}`);
    }

    fs.mkdirSync(path.dirname(this.configPath()), { recursive: true });
    fs.writeFileSync(this.configPath(), `${lines.join("\n")}\n`, "utf8");
  }

  private parse(content: string): RepoConfig {
    const images: RepoConfig["images"] = {};
    let inImagesSection = false;

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trimEnd();

      if (line.trim().length === 0 || line.trimStart().startsWith("#")) {
        continue;
      }

      if (line === "images:") {
        inImagesSection = true;
        continue;
      }

      if (inImagesSection && /^[^\s]/.test(line)) {
        inImagesSection = false;
      }

      if (!inImagesSection) {
        continue;
      }

      const match = line.match(/^  (api|frontend):\s*(.+)$/);
      if (match) {
        images[match[1] as ManagedImageService] = match[2];
      }
    }

    return { images };
  }
}
