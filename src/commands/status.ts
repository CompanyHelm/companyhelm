import type { Command } from "commander";

import { TerminalRenderer } from "../core/ui/TerminalRenderer.js";
import type { CommandDependencies, StatusReport } from "./dependencies.js";

export function registerStatusCommand(program: Command, dependencies: CommandDependencies): void {
  program.command("status").description("Show deployment status.").action(async () => {
    const renderer = new TerminalRenderer(process.stdout.isTTY);
    process.stdout.write(`${renderer.renderStatus(await dependencies.status())}\n`);
  });
}
