import fs from "node:fs";
import path from "node:path";

import { defaultCliConfigRoot } from "./CliRoot.js";

export type AgentWorkspaceMode = "dedicated" | "current-working-directory";

export interface LocalConfig {
  agentWorkspaceMode?: AgentWorkspaceMode;
}

function defaultLocalConfigRoot(): string {
  return defaultCliConfigRoot();
}

export class LocalConfigStore {
  public constructor(private readonly root: string = defaultLocalConfigRoot()) {}

  public configPath(): string {
    return path.join(this.root, "config.yaml");
  }

  public load(): LocalConfig {
    const configPath = this.configPath();
    if (!fs.existsSync(configPath)) {
      return {};
    }

    return this.parse(fs.readFileSync(configPath, "utf8"));
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

    fs.mkdirSync(path.dirname(this.configPath()), { recursive: true });
    fs.writeFileSync(this.configPath(), `${lines.join("\n")}\n`, "utf8");
  }

  private parse(content: string): LocalConfig {
    let agentWorkspaceMode: AgentWorkspaceMode | undefined;

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trimEnd();

      if (line.trim().length === 0 || line.trimStart().startsWith("#")) {
        continue;
      }

      const workspaceModeMatch = line.match(/^agent_workspace_mode:\s*(dedicated|current-working-directory)$/);
      if (workspaceModeMatch) {
        agentWorkspaceMode = workspaceModeMatch[1] as AgentWorkspaceMode;
      }
    }

    return { agentWorkspaceMode };
  }
}
