import fs from "node:fs";

import { LocalServiceProcessManager } from "./LocalServiceProcessManager.js";
import { CommandRunner } from "../process/CommandRunner.js";
import type { LogLevel } from "../../commands/dependencies.js";
import type { GithubAppConfig } from "../config/GithubAppConfig.js";
import type { LocalManagedServiceRuntime, RuntimeState } from "../runtime/RuntimeState.js";

export interface ApiLocalServiceStartInput {
  repoPath: string;
  configPath: string;
  graphqlUrl: string;
  logPath: string;
  githubAppConfig: GithubAppConfig;
  state: RuntimeState;
  logLevel: LogLevel;
}

export class ApiLocalService {
  public constructor(
    private readonly processManager = new LocalServiceProcessManager(),
    private readonly commandRunner = new CommandRunner()
  ) {}

  public async start(input: ApiLocalServiceStartInput): Promise<LocalManagedServiceRuntime> {
    await this.ensureNodeModules(input.repoPath);

    const runtime = this.processManager.start({
      serviceName: "api",
      repoPath: input.repoPath,
      command: process.execPath,
      args: [
        "./node_modules/tsx/dist/cli.mjs",
        "watch",
        "src/server.ts",
        "--config-path",
        input.configPath
      ],
      logPath: input.logPath,
      env: {
        APP_ENV: "local",
        GITHUB_APP_CLIENT_ID: input.githubAppConfig.appClientId,
        GITHUB_APP_URL: input.githubAppConfig.appUrl,
        GITHUB_APP_PRIVATE_KEY_PEM: input.githubAppConfig.appPrivateKeyPem,
        COMPANYHELM_JWT_PRIVATE_KEY_PEM: input.state.auth.jwtPrivateKeyPem,
        COMPANYHELM_JWT_PUBLIC_KEY_PEM: input.state.auth.jwtPublicKeyPem,
        COMPANYHELM_LOG_LEVEL: input.logLevel
      }
    });

    await this.waitForReadiness(input.graphqlUrl, runtime, "API");
    return runtime;
  }

  private async ensureNodeModules(repoPath: string): Promise<void> {
    if (fs.existsSync(`${repoPath}/node_modules`)) {
      return;
    }

    await this.commandRunner.run("npm", ["install"], repoPath);
  }

  private async waitForReadiness(
    url: string,
    runtime: LocalManagedServiceRuntime,
    serviceName: string
  ): Promise<void> {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if (!this.processManager.isRunning(runtime)) {
        throw new Error(`${serviceName} exited before becoming ready.`);
      }

      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch {
        // Retry until the deadline.
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }

    throw new Error(`${serviceName} did not become ready: ${url}`);
  }
}
