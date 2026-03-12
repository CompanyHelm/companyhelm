import fs from "node:fs";

import { CommandRunner } from "../process/CommandRunner.js";
import { RuntimePaths } from "../runtime/RuntimePaths.js";
import type { RuntimeState } from "../runtime/RuntimeState.js";
import { ComposeTemplateRenderer } from "./ComposeTemplateRenderer.js";

export class DockerStackManager {
  private readonly runtimePaths: RuntimePaths;

  public constructor(
    root: string,
    private readonly commandRunner = new CommandRunner(),
    private readonly composeRenderer = new ComposeTemplateRenderer()
  ) {
    this.runtimePaths = new RuntimePaths(root);
  }

  public async up(state: RuntimeState): Promise<void> {
    fs.mkdirSync(this.runtimePaths.runnerConfigPath(), { recursive: true });
    fs.writeFileSync(
      this.runtimePaths.composeFilePath(),
      this.composeRenderer.render({
        apiHttpPort: state.ports.apiHttp,
        uiPort: state.ports.ui,
        runnerGrpcPort: state.ports.runnerGrpc,
        agentCliGrpcPort: state.ports.agentCliGrpc
      }, {
        apiConfigPath: this.runtimePaths.apiConfigPath(),
        frontendConfigPath: this.runtimePaths.frontendConfigPath(),
        seedFilePath: this.runtimePaths.seedFilePath()
      }),
      "utf8"
    );

    await this.commandRunner.run("docker", [
      "compose",
      "-f",
      this.runtimePaths.composeFilePath(),
      "up",
      "-d"
    ]);
  }

  public async applySeedSql(): Promise<void> {
    if (!fs.existsSync(this.runtimePaths.seedFilePath())) {
      return;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        await this.commandRunner.run("docker", [
          "compose",
          "-f",
          this.runtimePaths.composeFilePath(),
          "exec",
          "-T",
          "postgres",
          "psql",
          "-U",
          "postgres",
          "-d",
          "companyhelm",
          "-f",
          "/run/companyhelm/seed.sql"
        ]);
        return;
      } catch (error) {
        lastError = error as Error;
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      }
    }

    throw lastError ?? new Error("Failed to apply seed SQL.");
  }

  public async down(): Promise<void> {
    if (!fs.existsSync(this.runtimePaths.composeFilePath())) {
      return;
    }

    await this.commandRunner.run("docker", [
      "compose",
      "-f",
      this.runtimePaths.composeFilePath(),
      "down",
      "--remove-orphans"
    ]);
  }

  public async logs(service: "postgres" | "api" | "frontend"): Promise<void> {
    await this.commandRunner.run("docker", [
      "compose",
      "-f",
      this.runtimePaths.composeFilePath(),
      "logs",
      service
    ]);
  }

  public async runningServices(): Promise<string> {
    if (!fs.existsSync(this.runtimePaths.composeFilePath())) {
      return "";
    }

    return this.commandRunner.capture("docker", [
      "compose",
      "-f",
      this.runtimePaths.composeFilePath(),
      "ps",
      "--services",
      "--status",
      "running"
    ]);
  }
}
