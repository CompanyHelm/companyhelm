import type { Command } from "commander";

import type { CommandDependencies } from "./dependencies.js";

const AVAILABLE_LOG_SERVICES = ["postgres", "api", "frontend", "runner"] as const;

export function registerLogsCommand(program: Command, dependencies: CommandDependencies): void {
  program
    .command("logs")
    .description("Show logs for a managed service.")
    .argument("[service]")
    .action(async (service?: string) => {
      if (!service) {
        process.stdout.write(`Available services:\n${AVAILABLE_LOG_SERVICES.map((name) => `- ${name}`).join("\n")}\n`);
        return;
      }

      await dependencies.logs(service);
    });
}
