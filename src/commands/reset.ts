import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

import type { Command } from "commander";

import type { CommandDependencies } from "./dependencies.js";

export async function confirmReset(
  input: Readable = process.stdin,
  output: Writable = process.stdout
): Promise<boolean> {
  if (!("isTTY" in input) || !input.isTTY) {
    throw new Error("reset requires confirmation from a TTY. Re-run with --yes to skip the prompt.");
  }

  const rl = createInterface({
    input,
    output
  });

  try {
    const answer = (await rl.question(
      "This will remove CompanyHelm containers, Postgres data, and local runtime state. Continue? [y/N] "
    )).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

export function registerResetCommand(program: Command, dependencies: CommandDependencies): void {
  program
    .command("reset")
    .description("Destroy the local deployment state.")
    .option("-y, --yes", "Skip the confirmation prompt.")
    .action(async (options: { yes?: boolean }) => {
      if (!options.yes) {
        const confirmed = await confirmReset();
        if (!confirmed) {
          process.stdout.write("Reset cancelled.\n");
          return;
        }
      }

      await dependencies.reset();
    });
}
