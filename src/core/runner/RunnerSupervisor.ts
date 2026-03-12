import path from "node:path";
import { createRequire } from "node:module";

export interface RunnerStartInput {
  grpcTarget: string;
  secret: string;
}

export interface RunnerStartCommand {
  command: string;
  args: string[];
}

const require = createRequire(import.meta.url);

export class RunnerSupervisor {
  public constructor(private readonly configPath: string) {}

  public buildStartArgs(input: RunnerStartInput): RunnerStartCommand {
    const runnerCliPath = this.resolveRunnerCliPath();

    return {
      command: process.execPath,
      args: [
        runnerCliPath,
        "--config-path",
        this.configPath,
        "runner",
        "start",
        "--grpc-target",
        input.grpcTarget,
        "--secret",
        input.secret
      ]
    };
  }

  public buildStopArgs(): RunnerStartCommand {
    const runnerCliPath = this.resolveRunnerCliPath();

    return {
      command: process.execPath,
      args: [runnerCliPath, "--config-path", this.configPath, "runner", "stop"]
    };
  }

  private resolveRunnerCliPath(): string {
    if (process.env.COMPANYHELM_RUNNER_CLI_PATH) {
      return process.env.COMPANYHELM_RUNNER_CLI_PATH;
    }

    const packageJsonPath = require.resolve("@companyhelm/runner/package.json");
    return path.resolve(path.dirname(packageJsonPath), "dist/cli.js");
  }
}
