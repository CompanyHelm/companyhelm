import type { CliIo } from "./cli_io_interface.js";

/**
 * Bridges the CLI output interface to the process streams used by npm-created
 * binaries while keeping command handlers independent from global console APIs.
 */
export class ConsoleIo implements CliIo {
  writeLine(message: string): void {
    process.stdout.write(`${message}\n`);
  }

  writeError(message: string): void {
    process.stderr.write(`${message}\n`);
  }
}
