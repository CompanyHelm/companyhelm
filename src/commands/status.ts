import type { Command } from "commander";

import type { CommandDependencies } from "./dependencies.js";

export function registerStatusCommand(program: Command, dependencies: CommandDependencies): void {
  program.command("status").description("Show deployment status.").action(async () => {
    process.stdout.write(`${JSON.stringify(await dependencies.status())}\n`);
  });
}
