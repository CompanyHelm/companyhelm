import fs from "node:fs";
import path from "node:path";

import { parse, stringify } from "yaml";

import { type GithubAppConfig, normalizeGithubAppConfig } from "./GithubAppConfig.js";
import { defaultCliConfigRoot } from "../runtime/CliRoot.js";

interface StoredGithubAppConfig {
  app_url?: string;
  app_client_id?: string;
  app_private_key_pem?: string;
}

function defaultConfigRoot(): string {
  return defaultCliConfigRoot();
}

export class GithubAppConfigStore {
  public constructor(private readonly configRoot = defaultConfigRoot()) {}

  public configPath(): string {
    return path.join(this.configRoot, "github-app.yaml");
  }

  public hasConfig(): boolean {
    return fs.existsSync(this.configPath());
  }

  public save(config: GithubAppConfig): string {
    const normalized = normalizeGithubAppConfig(config);
    fs.mkdirSync(this.configRoot, { recursive: true });

    const tempPath = `${this.configPath()}.tmp`;
    const yaml = stringify({
      app_url: normalized.appUrl,
      app_client_id: normalized.appClientId,
      app_private_key_pem: normalized.appPrivateKeyPem,
    });
    fs.writeFileSync(tempPath, yaml, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tempPath, this.configPath());
    return this.configPath();
  }

  public load(): GithubAppConfig | null {
    if (!this.hasConfig()) {
      return null;
    }

    const parsed = parse(fs.readFileSync(this.configPath(), "utf8")) as StoredGithubAppConfig | null;
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Machine GitHub App config at ${this.configPath()} is invalid.`);
    }

    return normalizeGithubAppConfig({
      appUrl: String(parsed.app_url || ""),
      appClientId: String(parsed.app_client_id || ""),
      appPrivateKeyPem: String(parsed.app_private_key_pem || ""),
    });
  }

  public loadOrThrow(): GithubAppConfig {
    const config = this.load();
    if (!config) {
      throw new Error(
        `GitHub App config is not set up. Run \`companyhelm setup-github-app\` to create ${this.configPath()}.`,
      );
    }
    return config;
  }

  public delete(): void {
    fs.rmSync(this.configPath(), { force: true });
  }
}
