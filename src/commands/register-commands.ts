import { Command } from "commander";

import { createDefaultDependencies, type CommandDependencies } from "./dependencies.js";
import { registerDownCommand } from "./down.js";
import { registerLogsCommand } from "./logs.js";
import { registerResetCommand } from "./reset.js";
import { registerStatusCommand } from "./status.js";
import { registerUpCommand } from "./up.js";

export function buildProgram(dependencies: CommandDependencies = createDefaultDependencies()): Command {
  const program = new Command().name("companyhelm");

  registerUpCommand(program, dependencies);
  registerDownCommand(program, dependencies);
  registerStatusCommand(program, dependencies);
  registerLogsCommand(program, dependencies);
  registerResetCommand(program, dependencies);

  return program;
}
