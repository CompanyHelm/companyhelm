import type { Command } from "commander";

import type { CommandDependencies } from "./dependencies.js";
import { AVAILABLE_MANAGED_SERVICE_NAMES } from "../core/services/ManagedServiceNames.js";

export function registerLogsCommand(program: Command, dependencies: CommandDependencies): void {
  program
    .command("logs")
    .description("Show logs for a managed service.")
    .argument("[service]")
    .action(async (service?: string) => {
      if (!service) {
        process.stdout.write(`Available services:\n${AVAILABLE_MANAGED_SERVICE_NAMES.map((name) => `- ${name}`).join("\n")}\n`);
        return;
      }

      await dependencies.logs(service);
    });
}
