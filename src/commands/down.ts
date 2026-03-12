import type { Command } from "commander";

export function registerDownCommand(program: Command): void {
  program.command("down").description("Stop the local deployment.");
}
