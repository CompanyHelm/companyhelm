import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { parse, stringify } from "yaml";

import { type GithubAppConfig, normalizeGithubAppConfig } from "./GithubAppConfig.js";

interface StoredGithubAppConfig {
  app_url?: string;
  app_client_id?: string;
  app_private_key_pem?: string;
}

function defaultConfigRoot(): string {
  const explicitRoot = String(process.env.COMPANYHELM_CONFIG_HOME || "").trim();
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }

  const xdgRoot = String(process.env.XDG_CONFIG_HOME || "").trim();
  if (xdgRoot) {
    return path.resolve(xdgRoot, "companyhelm");
  }

  return path.join(os.homedir(), ".config", "companyhelm");
}

export class GithubAppConfigStore {
  public constructor(private readonly configRoot = defaultConfigRoot()) {}

  public configPath(): string {
    return path.join(this.configRoot, "github-app.yaml");
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
    if (!fs.existsSync(this.configPath())) {
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
}
