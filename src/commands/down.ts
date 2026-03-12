import type { Command } from "commander";

import type { CommandDependencies } from "./dependencies.js";

export function registerDownCommand(program: Command, dependencies: CommandDependencies): void {
  program.command("down").description("Stop the local deployment.").action(async () => {
    await dependencies.down();
  });
}
