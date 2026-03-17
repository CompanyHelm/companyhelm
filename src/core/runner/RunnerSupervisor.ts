import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import type { LogLevel } from "../../commands/dependencies.js";
import type { AgentWorkspaceMode } from "../runtime/LocalConfigStore.js";

export interface RunnerStartInput {
  serverUrl: string;
  agentApiUrl: string;
  logPath: string;
  secret: string;
  logLevel?: LogLevel;
  useHostDockerRuntime?: boolean;
  workspaceMode?: AgentWorkspaceMode;
  projectRoot?: string;
}

export interface RunnerStartCommand {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
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
    const logLevel = (input.logLevel ?? "info").toUpperCase();
    const hostDockerArgs = input.useHostDockerRuntime
      ? ["--use-host-docker-runtime", "--host-docker-path", this.resolveHostDockerPath()]
      : [];
    const runnerEntrypoint = this.resolveRunnerEntrypointPath();
    const runnerCliOverridePath = this.resolveRunnerCliOverridePath();
    const env = input.workspaceMode === "current-working-directory" && input.projectRoot
      ? {
          COMPANYHELM_RUNNER_WORKSPACE_MODE: input.workspaceMode,
          COMPANYHELM_RUNNER_PROJECT_ROOT: input.projectRoot,
        }
      : undefined;

    return {
      command: process.execPath,
      args: [
        runnerEntrypoint,
        ...(runnerCliOverridePath ? [runnerCliOverridePath] : []),
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
        ...hostDockerArgs,
        "--secret",
        input.secret,
        "--log-level",
        logLevel
      ],
      env
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

  private resolveRunnerCliOverridePath(): string | null {
    const overridePath = String(process.env.COMPANYHELM_RUNNER_CLI_PATH || "").trim();
    return overridePath || null;
  }

  private resolveRunnerEntrypointPath(): string {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "runner-bootstrap.js");
  }

  private resolveHostDockerPath(): string {
    const dockerHost = String(process.env.DOCKER_HOST || "").trim();
    if (dockerHost) {
      return dockerHost;
    }

    return DEFAULT_HOST_DOCKER_PATH;
  }
}
