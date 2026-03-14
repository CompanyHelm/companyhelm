import type { Command } from "commander";

import type { CommandDependencies, LocalRepoOptionValue, LogLevel } from "./dependencies.js";

const LOG_LEVELS = new Set<LogLevel>(["debug", "info", "warn", "error"]);

export function registerUpCommand(program: Command, dependencies: CommandDependencies): void {
  program
    .command("up")
    .description("Start or reconcile the local deployment.")
    .option("--log-level <level>", "Set log level for api, frontend, and runner.", "info")
    .option("--api-repo-path [path]", "Start the API from a local repo path. Defaults to ../companyhelm-api when provided without a value.")
    .option("--web-repo-path [path]", "Start the frontend from a local repo path. Defaults to ../companyhelm-web when provided without a value.")
    .action(async (options: { logLevel: string; apiRepoPath?: string | boolean; webRepoPath?: string | boolean }) => {
      const logLevel = String(options.logLevel || "").trim().toLowerCase();
      if (!LOG_LEVELS.has(logLevel as LogLevel)) {
        throw new Error(`Unsupported log level "${options.logLevel}". Expected one of: debug, info, warn, error.`);
      }

      await dependencies.up({
        logLevel: logLevel as LogLevel,
        apiRepoPath: normalizeLocalRepoOption(options.apiRepoPath),
        webRepoPath: normalizeLocalRepoOption(options.webRepoPath)
      });
    });
}

function normalizeLocalRepoOption(option: string | boolean | undefined): LocalRepoOptionValue {
  if (option === true) {
    return true;
  }

  if (typeof option === "string") {
    const trimmed = option.trim();
    return trimmed.length > 0 ? trimmed : true;
  }

  return undefined;
}
