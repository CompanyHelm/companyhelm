import type { Command } from "commander";

export function registerUpCommand(program: Command): void {
  program.command("up").description("Start or reconcile the local deployment.");
}
