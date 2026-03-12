import type { Command } from "commander";

import type { CommandDependencies } from "./dependencies.js";

export function registerResetCommand(program: Command, dependencies: CommandDependencies): void {
  program
    .command("reset")
    .description("Destroy the local deployment state.")
    .action(async () => {
      await dependencies.reset();
    });
}
