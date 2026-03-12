import type { Command } from "commander";

import type { CommandDependencies, LogLevel } from "./dependencies.js";

const LOG_LEVELS = new Set<LogLevel>(["debug", "info", "warn", "error"]);

export function registerUpCommand(program: Command, dependencies: CommandDependencies): void {
  program
    .command("up")
    .description("Start or reconcile the local deployment.")
    .option("--log-level <level>", "Set log level for api, frontend, and runner.", "info")
    .action(async (options: { logLevel: string }) => {
      const logLevel = String(options.logLevel || "").trim().toLowerCase();
      if (!LOG_LEVELS.has(logLevel as LogLevel)) {
        throw new Error(`Unsupported log level "${options.logLevel}". Expected one of: debug, info, warn, error.`);
      }

      await dependencies.up({ logLevel: logLevel as LogLevel });
    });
}
