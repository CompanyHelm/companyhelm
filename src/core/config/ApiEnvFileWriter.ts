import fs from "node:fs";

import type { GithubAppConfig } from "./GithubAppConfig.js";
import { ProjectPaths } from "../runtime/ProjectPaths.js";

function escapeEnvValue(value: string): string {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\\n");
}

export class ApiEnvFileWriter {
  private readonly projectPaths: ProjectPaths;

  public constructor(projectRoot = process.cwd()) {
    this.projectPaths = new ProjectPaths(projectRoot);
  }

  public write(config: GithubAppConfig): string {
    fs.mkdirSync(this.projectPaths.apiDirectoryPath(), { recursive: true });
    const contents = [
      `GITHUB_APP_URL=${escapeEnvValue(config.appUrl)}`,
      `GITHUB_APP_CLIENT_ID=${escapeEnvValue(config.appClientId)}`,
      `GITHUB_APP_PRIVATE_KEY_PEM=${escapeEnvValue(config.appPrivateKeyPem)}`,
      "",
    ].join("\n");
    fs.writeFileSync(this.projectPaths.apiEnvPath(), contents, "utf8");
    return this.projectPaths.apiEnvPath();
  }
}
