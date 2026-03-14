import path from "node:path";
import { createRequire } from "node:module";

import type { LogLevel } from "../../commands/dependencies.js";

export interface RunnerStartInput {
  serverUrl: string;
  agentApiUrl: string;
  logPath: string;
  secret: string;
  logLevel?: LogLevel;
}

export interface RunnerStartCommand {
  command: string;
  args: string[];
}

const require = createRequire(import.meta.url);
const DEFAULT_HOST_DOCKER_PATH = "unix:///var/run/docker.sock";

export class RunnerSupervisor {
  public constructor(private readonly configPath: string) {}

  public buildUseHostAuthArgs(): RunnerStartCommand {
    const runnerCliPath = this.resolveRunnerCliPath();

    return {
      command: process.execPath,
      args: [runnerCliPath, "--config-path", this.configPath, "sdk", "codex", "use-host-auth"]
    };
  }

  public buildStartArgs(input: RunnerStartInput): RunnerStartCommand {
    const runnerCliPath = this.resolveRunnerCliPath();
    const logLevel = (input.logLevel ?? "info").toUpperCase();
    const hostDockerPath = this.resolveHostDockerPath();

    return {
      command: process.execPath,
      args: [
        runnerCliPath,
        "--config-path",
        this.configPath,
        "start",
        "--daemon",
        "--server-url",
        input.serverUrl,
        "--agent-api-url",
        input.agentApiUrl,
        "--log-path",
        input.logPath,
        "--use-host-docker-runtime",
        "--host-docker-path",
        hostDockerPath,
        "--secret",
        input.secret,
        "--log-level",
        logLevel
      ]
    };
  }

  public buildStopArgs(): RunnerStartCommand {
    const runnerCliPath = this.resolveRunnerCliPath();

    return {
      command: process.execPath,
      args: [runnerCliPath, "--config-path", this.configPath, "stop"]
    };
  }

  public buildStatusArgs(): RunnerStartCommand {
    const runnerCliPath = this.resolveRunnerCliPath();

    return {
      command: process.execPath,
      args: [runnerCliPath, "--config-path", this.configPath, "status"]
    };
  }

  private resolveRunnerCliPath(): string {
    if (process.env.COMPANYHELM_RUNNER_CLI_PATH) {
      return process.env.COMPANYHELM_RUNNER_CLI_PATH;
    }

    const packageJsonPath = require.resolve("@companyhelm/runner/package.json");
    return path.resolve(path.dirname(packageJsonPath), "dist/cli.js");
  }

  private resolveHostDockerPath(): string {
    const dockerHost = String(process.env.DOCKER_HOST || "").trim();
    if (dockerHost) {
      return dockerHost;
    }

    return DEFAULT_HOST_DOCKER_PATH;
  }
}
