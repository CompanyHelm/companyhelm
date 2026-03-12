import { Command } from "commander";

import { registerDownCommand } from "./down.js";
import { registerLogsCommand } from "./logs.js";
import { registerResetCommand } from "./reset.js";
import { registerStatusCommand } from "./status.js";
import { registerUpCommand } from "./up.js";

export function buildProgram(): Command {
  const program = new Command().name("companyhelm");

  registerUpCommand(program);
  registerDownCommand(program);
  registerStatusCommand(program);
  registerLogsCommand(program);
  registerResetCommand(program);

  return program;
}
