import type { Command } from "commander";

import type { CommandDependencies } from "./dependencies.js";

export function registerResetCommand(program: Command, dependencies: CommandDependencies): void {
  program
    .command("reset")
    .description("Destroy the local deployment state.")
    .option("--force")
    .action(async (options: { force?: boolean }) => {
      if (!options.force) {
        throw new Error("reset requires --force");
      }

      await dependencies.reset();
    });
}
