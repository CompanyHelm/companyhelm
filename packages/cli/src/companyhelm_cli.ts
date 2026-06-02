import { readFileSync } from "node:fs";
import { Command } from "commander";
import type { CliIo } from "./cli_io_interface.js";
import { ConsoleIo } from "./console_io.js";

type PackageDocument = {
  version?: string;
};

/**
 * Defines the public `companyhelm` command that npm users install. The initial
 * command surface intentionally focuses on package discovery and local stack
 * entry points while the server and runner implementations evolve separately.
 */
export class CompanyHelmCli {
  private readonly io: CliIo;

  constructor(io: CliIo = new ConsoleIo()) {
    this.io = io;
  }

  async run(argv: string[]): Promise<void> {
    await this.createProgram().parseAsync(argv, {
      from: "node",
    });
  }

  createProgram(): Command {
    const program = new Command()
      .name("companyhelm")
      .description("CompanyHelm self-hosting CLI.")
      .version(this.readVersion())
      .showHelpAfterError()
      .configureOutput({
        writeErr: (message) => this.io.writeError(message.trimEnd()),
        writeOut: (message) => this.io.writeLine(message.trimEnd()),
      });

    program.addCommand(this.createStatusCommand());
    program.addCommand(this.createServerCommand());
    program.addCommand(this.createRunnerCommand());
    return program;
  }

  private createStatusCommand(): Command {
    return new Command("status")
      .description("Show the installed CompanyHelm CLI package layout.")
      .action(() => this.printStatus());
  }

  private createServerCommand(): Command {
    return new Command("server")
      .description("Show how to work with the CompanyHelm server package.")
      .argument("[command]", "Server command to prepare for.", "start")
      .action((command: string) => this.printServerCommand(command));
  }

  private createRunnerCommand(): Command {
    return new Command("runner")
      .description("Show how to work with the CompanyHelm runner package.")
      .argument("[command]", "Runner command to prepare for.", "start")
      .action((command: string) => this.printRunnerCommand(command));
  }

  private printStatus(): void {
    this.io.writeLine("CompanyHelm CLI is installed.");
    this.io.writeLine("Main CLI package: companyhelm");
    this.io.writeLine("Runner package: @companyhelm/runner");
    this.io.writeLine("Server workspace package: @companyhelm/server");
  }

  private printServerCommand(command: string): void {
    this.io.writeLine(`Server command requested: ${command}`);
    this.io.writeLine("Use npm workspace scripts in this repo with -w @companyhelm/server while the packaged server runtime is being finalized.");
  }

  private printRunnerCommand(command: string): void {
    this.io.writeLine(`Runner command requested: ${command}`);
    this.io.writeLine("Use `npx @companyhelm/runner start` for the standalone runner package.");
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
