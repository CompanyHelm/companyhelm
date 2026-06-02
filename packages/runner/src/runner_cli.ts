import { readFileSync } from "node:fs";
import { Command } from "commander";
import { ConsoleRunnerIo } from "./console_runner_io.js";
import type { RunnerIo } from "./runner_io_interface.js";

type PackageDocument = {
  version?: string;
};

type RunnerStartOptions = {
  serverUrl?: string;
};

/**
 * Defines the standalone CompanyHelm runner command package. This package is
 * separated from the main CLI so runner-specific runtime dependencies can grow
 * independently from the lightweight user-facing `companyhelm` command.
 */
export class RunnerCli {
  private readonly io: RunnerIo;

  constructor(io: RunnerIo = new ConsoleRunnerIo()) {
    this.io = io;
  }

  async run(argv: string[]): Promise<void> {
    await this.createProgram().parseAsync(argv, {
      from: "node",
    });
  }

  createProgram(): Command {
    const program = new Command()
      .name("companyhelm-runner")
      .description("CompanyHelm runner CLI.")
      .version(this.readVersion())
      .showHelpAfterError()
      .configureOutput({
        writeErr: (message) => this.io.writeError(message.trimEnd()),
        writeOut: (message) => this.io.writeLine(message.trimEnd()),
      });

    program.addCommand(this.createStartCommand());
    program.addCommand(this.createStatusCommand());
    return program;
  }

  private createStartCommand(): Command {
    return new Command("start")
      .description("Prepare a CompanyHelm runner process.")
      .option("--server-url <url>", "CompanyHelm server URL the runner should connect to.")
      .action((options: RunnerStartOptions) => this.printStartPlan(options));
  }

  private createStatusCommand(): Command {
    return new Command("status")
      .description("Show runner package status.")
      .action(() => this.printStatus());
  }

  private printStartPlan(options: RunnerStartOptions): void {
    this.io.writeLine("CompanyHelm runner package is installed.");
    this.io.writeLine(`Server URL: ${options.serverUrl ?? "not configured"}`);
    this.io.writeLine(`Token environment: ${process.env.COMPANYHELM_RUNNER_TOKEN ? "configured" : "not configured"}`);
  }

  private printStatus(): void {
    this.io.writeLine("CompanyHelm runner CLI is installed.");
  }

  private readVersion(): string {
    const packageDocument = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as PackageDocument;

    if (typeof packageDocument.version !== "string" || packageDocument.version.length === 0) {
      return "0.0.0";
    }
    return packageDocument.version;
  }
}
