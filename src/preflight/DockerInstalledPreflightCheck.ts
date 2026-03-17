import { CommandRunner } from "../core/process/CommandRunner.js";
import type { PreflightCheck } from "./PreflightCheck.js";

export class DockerInstalledPreflightCheck implements PreflightCheck {
  public constructor(private readonly commandRunner = new CommandRunner()) {}

  public async run(): Promise<void> {
    try {
      await this.commandRunner.capture("docker", ["--version"]);
    } catch {
      throw new Error(
        "Docker is required for `companyhelm up`, but the `docker` command is unavailable. Install Docker and make sure it is on your PATH."
      );
    }
  }
}
