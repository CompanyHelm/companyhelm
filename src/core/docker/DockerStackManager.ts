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
        uiPort: state.ports.ui,
        runnerGrpcPort: state.ports.runnerGrpc,
        agentCliGrpcPort: state.ports.agentCliGrpc
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
