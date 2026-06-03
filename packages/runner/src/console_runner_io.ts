import type { RunnerIo } from "./runner_io_interface.js";

/**
 * Connects runner command output to process streams for the npm binary while
 * keeping the command class easy to test with a captured output implementation.
 */
export class ConsoleRunnerIo implements RunnerIo {
  writeLine(message: string): void {
    process.stdout.write(`${message}\n`);
  }

  writeError(message: string): void {
    process.stderr.write(`${message}\n`);
  }
}
