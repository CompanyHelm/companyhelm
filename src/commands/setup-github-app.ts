import * as clack from "@clack/prompts";
import chalk from "chalk";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

import type { Command } from "commander";

import { unwrapPromptResult, requireInteractiveTerminal, InteractiveCommandCancelledError } from "./interactive.js";
import { GithubAppConfigStore } from "../core/config/GithubAppConfigStore.js";
import { normalizeGithubAppConfig, type GithubAppConfig } from "../core/config/GithubAppConfig.js";

const GITHUB_NEW_APP_URL = "https://github.com/settings/apps/new";

type BrowserUrlOpener = (url: string) => Promise<void>;

function getBrowserOpenCommand(url: string): { command: string; args: string[] } {
  if (process.platform === "darwin") {
    return { command: "open", args: [url] };
  }

  if (process.platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", url] };
  }

  return { command: "xdg-open", args: [url] };
}

async function openUrlInBrowser(url: string): Promise<void> {
  const { command, args } = getBrowserOpenCommand(url);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function writeGithubAppCreationGuide(output: Writable): void {
  const divider = chalk.dim("=".repeat(68));
  const label = (text: string) => chalk.bold(chalk.cyan(text));
  const value = (text: string) => chalk.white(text);

  output.write(
    [
      divider,
      chalk.bold("Create a GitHub App before continuing"),
      chalk.dim("CompanyHelm needs a local GitHub App before startup can continue."),
      chalk.dim("Agents use that app to access and work on your repositories from isolated container workspaces."),
      chalk.dim("That lets each agent clone repos and operate safely without reusing your host checkout."),
      "",
      `${label("New app page")} ${chalk.underline(chalk.green(GITHUB_NEW_APP_URL))}`,
      "",
      chalk.bold("Recommended form values"),
      `${label("GitHub App name:")} ${value("Any name you like, e.g. companyhelm <your deployment name>")}`,
      `${label("Public link:")} ${value("Paste your public link here")}`,
      `${label("Setup URL (optional):")} ${value("http://localhost:4173/github/install")}`,
      `${label("Redirect on update:")} ${value("Checked")}`,
      `${label("Webhook:")} ${value("Leave it inactive and uncheck the webhook option")}`,
      `${label("Permissions:")} ${value("Grant at least Contents so CompanyHelm can download repositories; add any additional permissions your agents need")}`,
      `${label("Where can this GitHub App be installed?")} ${value("Select Any account")}`,
      "",
      chalk.bold("Bring back after creation"),
      value("App URL, Client ID, and private key PEM"),
      "",
      divider,
      "",
    ].join("\n"),
  );
}

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
  output.write(
    [
      "Generate a private key.",
      "Once downloaded copy the contents (e.g. cat ~/Downloads/{your-app-name}{date}.pem | pbcopy) and paste it here.",
      "",
    ].join("\n"),
  );

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
  openBrowser: BrowserUrlOpener = openUrlInBrowser,
): Promise<GithubAppConfig> {
  requireInteractiveTerminal(
    input,
    output,
    "setup-github-app requires an interactive terminal.",
  );

  writeGithubAppCreationGuide(output);

  const shouldOpenBrowser = unwrapPromptResult(
    await clack.confirm({
      message: `Open ${GITHUB_NEW_APP_URL} in your browser now?`,
      active: "Yes",
      inactive: "No",
      initialValue: true,
      input,
      output,
    }),
    "GitHub App setup cancelled.",
    output,
  );

  if (shouldOpenBrowser) {
    try {
      await openBrowser(GITHUB_NEW_APP_URL);
      output.write(`Opened ${GITHUB_NEW_APP_URL} in your browser.\n\n`);
    } catch {
      output.write(
        [
          "Could not open a browser automatically.",
          `Open this URL manually: ${GITHUB_NEW_APP_URL}`,
          "",
        ].join("\n"),
      );
    }
  }

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
    "GitHub App Client ID (not the App ID)",
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

export async function ensureGithubAppConfig(
  store = new GithubAppConfigStore(),
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): Promise<GithubAppConfig> {
  const existingConfig = store.load();
  if (existingConfig) {
    return existingConfig;
  }

  requireInteractiveTerminal(
    input,
    output,
    `GitHub App config is not set up. Run \`companyhelm setup-github-app\` or rerun \`companyhelm up\` in a TTY.`,
  );

  clack.intro("CompanyHelm GitHub App setup", { output });
  clack.note(
    [
      "No machine GitHub App config was found.",
      "CompanyHelm will collect it now and then continue startup.",
    ].join("\n"),
    "Setup required",
    { output },
  );

  const config = await promptGithubAppConfig(input, output);
  const spinner = clack.spinner({ output });
  spinner.start("Saving machine GitHub App config");
  const configPath = store.save(config);
  spinner.stop(`Saved GitHub App config to ${configPath}`);
  clack.outro("GitHub App setup complete. Continuing startup.", { output });
  return config;
}

export function registerSetupGithubAppCommand(
  program: Command,
  store = new GithubAppConfigStore(),
): void {
  program
    .command("setup-github-app")
    .description("Save machine-wide GitHub App config for local deploys.")
    .action(async () => {
      clack.intro("CompanyHelm GitHub App setup");
      const config = await promptGithubAppConfig();
      const spinner = clack.spinner();
      spinner.start("Saving machine GitHub App config");
      const configPath = store.save(config);
      spinner.stop(`Saved GitHub App config to ${configPath}`);
      clack.outro(`Saved GitHub App config to ${configPath}.`);
    });
}
