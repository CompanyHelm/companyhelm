import * as clack from "@clack/prompts";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

import type { Command } from "commander";

import { unwrapPromptResult, requireInteractiveTerminal, InteractiveCommandCancelledError } from "./interactive.js";
import { GithubAppConfigStore } from "../core/config/GithubAppConfigStore.js";
import { normalizeGithubAppConfig, type GithubAppConfig } from "../core/config/GithubAppConfig.js";

async function promptTextValue(
  message: string,
  input: Readable,
  output: Writable,
  validate?: (value: string | undefined) => string | undefined,
): Promise<string> {
  const value = await clack.text({
    message,
    input,
    output,
    validate,
  });
  return String(unwrapPromptResult(value, "GitHub App setup cancelled.", output)).trim();
}

export async function readPemFromTerminal(
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): Promise<string> {
  requireInteractiveTerminal(
    input,
    output,
    "setup-github-app requires an interactive terminal.",
  );
  output.write("Paste the GitHub App private key PEM. Input ends after the -----END ...----- line.\n");

  const readline = createInterface({
    input,
    output,
    terminal: false,
  });

  return await new Promise<string>((resolve, reject) => {
    const lines: string[] = [];
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      readline.close();
      callback();
    };

    readline.on("line", (line) => {
      lines.push(line);
      if (/^-----END [A-Z0-9 ]+-----$/.test(line.trim())) {
        finish(() => {
          try {
            const normalized = normalizeGithubAppConfig({
              appUrl: "https://github.com/apps/placeholder",
              appClientId: "placeholder",
              appPrivateKeyPem: `${lines.join("\n")}\n`,
            });
            resolve(normalized.appPrivateKeyPem);
          } catch (error) {
            reject(error);
          }
        });
      }
    });

    readline.on("close", () => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error("GitHub App PEM input ended before a PEM end marker was received."));
    });

    readline.on("SIGINT", () => {
      finish(() => {
        reject(new InteractiveCommandCancelledError("GitHub App setup cancelled."));
      });
    });

    readline.on("error", (error) => {
      finish(() => {
        reject(error);
      });
    });
  });
}

export async function promptGithubAppConfig(
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): Promise<GithubAppConfig> {
  requireInteractiveTerminal(
    input,
    output,
    "setup-github-app requires an interactive terminal.",
  );

  output.write(
    [
      "Create a GitHub App before continuing.",
      "You will need the App URL, the Client ID, and the private key PEM.",
      "",
    ].join("\n"),
  );

  const appUrl = await promptTextValue(
    "GitHub App URL",
    input,
    output,
    (value) => {
      try {
        new URL(String(value || "").trim());
        return undefined;
      } catch {
        return "Enter a valid GitHub App URL.";
      }
    },
  );
  const appClientId = await promptTextValue(
    "GitHub App Client ID",
    input,
    output,
    (value) => (String(value || "").trim() ? undefined : "Client ID is required."),
  );
  const appPrivateKeyPem = await readPemFromTerminal(input, output);

  return normalizeGithubAppConfig({
    appUrl,
    appClientId,
    appPrivateKeyPem,
  });
}

export function registerSetupGithubAppCommand(
  program: Command,
  store = new GithubAppConfigStore(),
): void {
  program
    .command("setup-github-app")
    .description("Save machine-wide GitHub App config for local deploys.")
    .action(async () => {
      const config = await promptGithubAppConfig();
      const configPath = store.save(config);
      clack.outro(`Saved GitHub App config to ${configPath}.`);
    });
}
