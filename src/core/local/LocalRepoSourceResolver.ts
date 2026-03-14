import fs from "node:fs";
import path from "node:path";

import type { LocalRepoOptionValue } from "../../commands/dependencies.js";

export interface DockerServiceSource {
  source: "docker";
}

export interface LocalRepoServiceSource {
  source: "local";
  repoPath: string;
}

export type ResolvedServiceSource = DockerServiceSource | LocalRepoServiceSource;

export interface ResolvedServiceSources {
  api: ResolvedServiceSource;
  frontend: ResolvedServiceSource;
}

export interface LocalRepoSourceOptions {
  apiRepoPath?: LocalRepoOptionValue;
  webRepoPath?: LocalRepoOptionValue;
}

export class LocalRepoSourceResolver {
  public constructor(private readonly companyhelmRoot: string = process.cwd()) {}

  public resolve(options: LocalRepoSourceOptions): ResolvedServiceSources {
    return {
      api: this.resolveService("api", options.apiRepoPath, "../companyhelm-api"),
      frontend: this.resolveService("frontend", options.webRepoPath, "../companyhelm-web")
    };
  }

  private resolveService(
    service: "api" | "frontend",
    option: LocalRepoOptionValue,
    defaultRelativePath: string
  ): ResolvedServiceSource {
    if (option === undefined) {
      return {
        source: "docker"
      };
    }

    const repoPath = path.resolve(
      this.companyhelmRoot,
      option === true ? defaultRelativePath : option
    );
    this.assertRepoPathExists(service, repoPath);
    return {
      source: "local",
      repoPath
    };
  }

  private assertRepoPathExists(service: "api" | "frontend", repoPath: string): void {
    if (fs.existsSync(repoPath) && fs.statSync(repoPath).isDirectory()) {
      return;
    }

    throw new Error(`Local ${service} repo path does not exist: ${repoPath}`);
  }
}
