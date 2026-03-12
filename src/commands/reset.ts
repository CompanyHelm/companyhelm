import type { Command } from "commander";

export function registerResetCommand(program: Command): void {
  program.command("reset").description("Destroy the local deployment state.").option("--force");
}
