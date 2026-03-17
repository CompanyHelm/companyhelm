import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { GithubAppConfig } from "./GithubAppConfig.js";
import { RuntimePaths } from "../runtime/RuntimePaths.js";

function escapeEnvValue(value: string): string {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\\n");
}

export class ApiEnvFileWriter {
  private readonly runtimePaths: RuntimePaths;
  private readonly templatePath: string;

  public constructor(root: string) {
    this.runtimePaths = new RuntimePaths(root);
    this.templatePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../templates/api.env.tpl");
  }

  public write(config: GithubAppConfig | null): string {
    fs.mkdirSync(this.runtimePaths.apiDirectoryPath(), { recursive: true });
    const contents = this.render(config);
    fs.writeFileSync(this.runtimePaths.apiEnvPath(), contents, "utf8");
    return this.runtimePaths.apiEnvPath();
  }

  private render(config: GithubAppConfig | null): string {
    const template = fs.readFileSync(this.templatePath, "utf8");
    const rendered = template
      .replace("{{GITHUB_APP_URL}}", escapeEnvValue(config?.appUrl ?? ""))
      .replace("{{GITHUB_APP_CLIENT_ID}}", escapeEnvValue(config?.appClientId ?? ""))
      .replace("{{GITHUB_APP_PRIVATE_KEY_PEM}}", escapeEnvValue(config?.appPrivateKeyPem ?? ""));
    return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
  }
}
