import type { Command } from "commander";

export function registerLogsCommand(program: Command): void {
  program.command("logs").description("Show logs for a managed service.").argument("<service>");
}
