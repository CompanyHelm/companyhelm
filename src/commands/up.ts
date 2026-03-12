import type { Command } from "commander";

import type { CommandDependencies } from "./dependencies.js";

export function registerUpCommand(program: Command, dependencies: CommandDependencies): void {
  program.command("up").description("Start or reconcile the local deployment.").action(async () => {
    await dependencies.up();
  });
}
