import fs from "node:fs";

import { LocalServiceProcessManager } from "./LocalServiceProcessManager.js";
import { CommandRunner } from "../process/CommandRunner.js";
import type { LogLevel } from "../../commands/dependencies.js";
import type { LocalManagedServiceRuntime } from "../runtime/RuntimeState.js";

export interface WebLocalServiceStartInput {
  repoPath: string;
  configPath: string;
  url: string;
  uiPort: number;
  logPath: string;
  logLevel: LogLevel;
}

export class WebLocalService {
  public constructor(
    private readonly processManager = new LocalServiceProcessManager(),
    private readonly commandRunner = new CommandRunner()
  ) {}

  public async start(input: WebLocalServiceStartInput): Promise<LocalManagedServiceRuntime> {
    await this.ensureNodeModules(input.repoPath);
    await this.commandRunner.run(
      "npm",
      ["run", "config:generate", "--", "--config-path", input.configPath],
      input.repoPath,
      {
        APP_ENV: "local"
      }
    );

    const runtime = this.processManager.start({
      serviceName: "frontend",
      repoPath: input.repoPath,
      command: process.execPath,
      args: [
        "scripts/vite.js",
        "dev",
        "--config-path",
        input.configPath,
        "--host",
        "0.0.0.0",
        "--port",
        String(input.uiPort)
      ],
      logPath: input.logPath,
      env: {
        APP_ENV: "local",
        COMPANYHELM_LOG_LEVEL: input.logLevel,
        npm_config_loglevel: input.logLevel
      }
    });

    await this.waitForReadiness(input.url, runtime);
    return runtime;
  }

  private async ensureNodeModules(repoPath: string): Promise<void> {
    if (fs.existsSync(`${repoPath}/node_modules`)) {
      return;
    }

    await this.commandRunner.run("npm", ["install"], repoPath);
  }

  private async waitForReadiness(url: string, runtime: LocalManagedServiceRuntime): Promise<void> {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if (!this.processManager.isRunning(runtime)) {
        throw new Error("Frontend exited before becoming ready.");
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

    throw new Error(`Frontend did not become ready: ${url}`);
  }
}
