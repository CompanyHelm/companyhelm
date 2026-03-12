import type { Command } from "commander";

import type { CommandDependencies } from "./dependencies.js";

export function registerLogsCommand(program: Command, dependencies: CommandDependencies): void {
  program
    .command("logs")
    .description("Show logs for a managed service.")
    .argument("<service>")
    .action(async (service: string) => {
      await dependencies.logs(service);
    });
}
