import { readFileSync } from "node:fs";
import { Command } from "commander";
import type { CliIo } from "./cli_io_interface.js";
import { ConsoleIo } from "./console_io.js";
import { ProviderLoginCommand } from "./provider/login_command.js";
import { TerminalStyle } from "./terminal_style.js";

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

  async run(argv: string[]): Promise<number> {
    try {
      await this.createProgram().parseAsync(argv, {
        from: "node",
      });
      return 0;
    } catch (error) {
      this.io.writeError(TerminalStyle.error(CompanyHelmCli.errorMessage(error)));
      return 1;
    }
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
    program.addCommand(this.createProviderCommand());
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


  private createProviderCommand(): Command {
    const providerCommand = new Command("provider")
      .description("Work with CompanyHelm model provider credentials.");

    providerCommand.addCommand(new Command("login")
      .description("Complete a provider subscription credential login request.")
      .requiredOption("--code <code>", "Provider login code from CompanyHelm.")
      .option("--api-url <url>", "CompanyHelm API URL.", ProviderLoginCommand.DEFAULT_API_URL)
      .action(async (options: { apiUrl: string; code: string }) => {
        await new ProviderLoginCommand(this.io).run({
          apiUrl: options.apiUrl,
          code: options.code,
        });
      }));

    return providerCommand;
  }

  private static errorMessage(error: unknown): string {
    if (error instanceof Error && error.message.length > 0) {
      if (error.message === "This login code is invalid or expired.") {
        return "This login code is invalid or expired. Create a new provider login command in CompanyHelm and run it again.";
      }

      return error.message;
    }

    return "CompanyHelm CLI failed. Try again, or contact support if the issue continues.";
  }

  private printStatus(): void {
    this.io.writeLine("CompanyHelm CLI is installed.");
    this.io.writeLine("Main CLI package: @companyhelm/cli");
    this.io.writeLine("Runner package: @companyhelm/runner");
    this.io.writeLine("Server workspace package: @companyhelm/server");
  }

  private printServerCommand(command: string): void {
    this.io.writeLine(`Server command requested: ${command}`);
    this.io.writeLine("Use npm workspace scripts in this repo with -w @companyhelm/server while the packaged server runtime is being finalized.");
  }

  private printRunnerCommand(command: string): void {
    this.io.writeLine(`Runner command requested: ${command}`);
    this.io.writeLine("Use `npm run dev:runner -- start` in this repo, or install the published `@companyhelm/runner` package and run `companyhelm-runner start`.");
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
