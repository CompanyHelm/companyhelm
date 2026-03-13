import * as clack from "@clack/prompts";
import type { Readable, Writable } from "node:stream";

import type { Command } from "commander";

import { GithubAppConfigStore } from "../core/config/GithubAppConfigStore.js";
import type { CommandDependencies } from "./dependencies.js";
import { requireInteractiveTerminal, unwrapPromptResult } from "./interactive.js";

export async function confirmReset(
  input: Readable = process.stdin,
  output: Writable = process.stdout
): Promise<boolean> {
  requireInteractiveTerminal(input, output, "reset requires confirmation from a TTY. Re-run with --yes to skip the prompt.");
  const confirmed = await clack.confirm({
    message: "This will remove CompanyHelm containers, Postgres data, local runtime state, and generated .companyhelm/api/.env. Continue?",
    active: "Yes",
    inactive: "No",
    initialValue: false,
    input,
    output
  });

  return unwrapPromptResult(confirmed, "Reset cancelled.", output);
}

export async function confirmRemoveGithubAppConfig(
  store = new GithubAppConfigStore(),
  input: Readable = process.stdin,
  output: Writable = process.stdout
): Promise<boolean> {
  if (!store.hasConfig()) {
    return false;
  }

  requireInteractiveTerminal(input, output, "reset requires confirmation from a TTY. Re-run with --yes to skip the prompt.");
  const confirmed = await clack.confirm({
    message: `Also remove the machine GitHub App config at ${store.configPath()}?`,
    active: "Remove it",
    inactive: "Keep it",
    initialValue: false,
    input,
    output
  });

  return unwrapPromptResult(confirmed, "Reset cancelled.", output);
}

export function registerResetCommand(program: Command, dependencies: CommandDependencies): void {
  program
    .command("reset")
    .description("Destroy the local deployment state.")
    .option("-y, --yes", "Skip the confirmation prompt.")
    .option("--remove-github-app-config", "Also remove the machine GitHub App config.")
    .action(async (options: { yes?: boolean; removeGithubAppConfig?: boolean }) => {
      let removeGithubAppConfig = Boolean(options.removeGithubAppConfig);

      if (!options.yes) {
        const confirmed = await confirmReset();
        if (!confirmed) {
          clack.cancel("Reset cancelled.");
          return;
        }

        if (!removeGithubAppConfig) {
          removeGithubAppConfig = await confirmRemoveGithubAppConfig();
        }
      }

      await dependencies.reset({ removeGithubAppConfig });
    });
}
