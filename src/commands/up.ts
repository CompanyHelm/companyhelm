import type { Command } from "commander";

import type { CommandDependencies, LocalRepoOptionValue, LogLevel } from "./dependencies.js";

const LOG_LEVELS = new Set<LogLevel>(["debug", "info", "warn", "error"]);

export function registerUpCommand(program: Command, dependencies: CommandDependencies): void {
  program
    .command("up")
    .description("Start or reconcile the local deployment.")
    .option("--log-level <level>", "Set log level for api, companyhelm-web, and runner.", "info")
    .option("--use-host-docker-runtime", "Run thread containers against the host Docker runtime instead of DinD sidecars.")
    .option("--api-repo-path [path]", "Start the API from a local repo path. Defaults to ../companyhelm-api when provided without a value.")
    .option("--web-repo-path [path]", "Start companyhelm-web from a local repo path. Defaults to ../companyhelm-web when provided without a value.")
    .action(async (options: { logLevel: string; useHostDockerRuntime?: boolean; apiRepoPath?: string | boolean; webRepoPath?: string | boolean }) => {
      const logLevel = String(options.logLevel || "").trim().toLowerCase();
      if (!LOG_LEVELS.has(logLevel as LogLevel)) {
        throw new Error(`Unsupported log level "${options.logLevel}". Expected one of: debug, info, warn, error.`);
      }

      const upOptions: Parameters<CommandDependencies["up"]>[0] = {
        logLevel: logLevel as LogLevel,
        useHostDockerRuntime: Boolean(options.useHostDockerRuntime)
      };
      const apiRepoPath = normalizeLocalRepoOption(options.apiRepoPath);
      const webRepoPath = normalizeLocalRepoOption(options.webRepoPath);

      if (apiRepoPath !== undefined) {
        upOptions.apiRepoPath = apiRepoPath;
      }
      if (webRepoPath !== undefined) {
        upOptions.webRepoPath = webRepoPath;
      }

      await dependencies.up(upOptions);
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
