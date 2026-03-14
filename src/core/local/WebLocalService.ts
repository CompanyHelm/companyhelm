import fs from "node:fs";
import net from "node:net";

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
  private static readonly SERVICE_NAME = "companyhelm-web";

  public constructor(
    private readonly processManager = new LocalServiceProcessManager(),
    private readonly commandRunner = new CommandRunner()
  ) {}

  public async start(input: WebLocalServiceStartInput): Promise<LocalManagedServiceRuntime> {
    await this.assertUiPortAvailable(input.uiPort);
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
      serviceName: WebLocalService.SERVICE_NAME,
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
        throw new Error(this.buildStartupFailureMessage(runtime, `${WebLocalService.SERVICE_NAME} exited before becoming ready.`));
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

    throw new Error(`companyhelm-web did not become ready: ${url}`);
  }

  private async assertUiPortAvailable(port: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const server = net.createServer();

      server.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          reject(new Error(`companyhelm-web cannot start because port ${port} is already in use.`));
          return;
        }

        reject(new Error(`companyhelm-web cannot verify port ${port}: ${error.message}`));
      });

      server.once("listening", () => {
        server.close((closeError) => {
          if (closeError) {
            reject(closeError);
            return;
          }
          resolve();
        });
      });

      server.listen(port, "0.0.0.0");
    });
  }

  private buildStartupFailureMessage(runtime: LocalManagedServiceRuntime, summary: string): string {
    if (!fs.existsSync(runtime.logPath)) {
      return summary;
    }

    const startupLog = fs.readFileSync(runtime.logPath, "utf8").trim();
    if (!startupLog) {
      return summary;
    }

    const tail = startupLog.split(/\r?\n/).slice(-20).join("\n");
    return `${summary}\nStartup log:\n${tail}`;
  }
}
