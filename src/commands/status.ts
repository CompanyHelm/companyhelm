import type { Command } from "commander";

export function registerStatusCommand(program: Command): void {
  program.command("status").description("Show deployment status.");
}
