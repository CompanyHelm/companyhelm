import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { ManagedImageService } from "./ManagedImages.js";

export type AgentWorkspaceMode = "dedicated" | "current-working-directory";

export interface LocalConfig {
  agentWorkspaceMode?: AgentWorkspaceMode;
  images: Partial<Record<ManagedImageService, string>>;
}

function defaultLocalConfigRoot(): string {
  return process.env.COMPANYHELM_HOME || path.join(os.homedir(), ".companyhelm");
}

export class LocalConfigStore {
  public constructor(private readonly root: string = defaultLocalConfigRoot()) {}

  public configPath(): string {
    return path.join(this.root, "config.yaml");
  }

  public load(): LocalConfig {
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

  public setAgentWorkspaceMode(
    agentWorkspaceMode: AgentWorkspaceMode
  ): { configPath: string; agentWorkspaceMode: AgentWorkspaceMode } {
    const nextConfig = this.load();
    nextConfig.agentWorkspaceMode = agentWorkspaceMode;
    this.save(nextConfig);
    return { configPath: this.configPath(), agentWorkspaceMode };
  }

  public save(config: LocalConfig): void {
    const lines: string[] = [];
    if (config.agentWorkspaceMode) {
      lines.push(`agent_workspace_mode: ${config.agentWorkspaceMode}`);
    }
    lines.push("images:");
    if (config.images.api) {
      lines.push(`  api: ${config.images.api}`);
    }
    if (config.images.frontend) {
      lines.push(`  frontend: ${config.images.frontend}`);
    }

    fs.mkdirSync(path.dirname(this.configPath()), { recursive: true });
    fs.writeFileSync(this.configPath(), `${lines.join("\n")}\n`, "utf8");
  }

  private parse(content: string): LocalConfig {
    const images: LocalConfig["images"] = {};
    let agentWorkspaceMode: AgentWorkspaceMode | undefined;
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

      const workspaceModeMatch = line.match(/^agent_workspace_mode:\s*(dedicated|current-working-directory)$/);
      if (workspaceModeMatch) {
        agentWorkspaceMode = workspaceModeMatch[1] as AgentWorkspaceMode;
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

    return {
      agentWorkspaceMode,
      images
    };
  }
}
