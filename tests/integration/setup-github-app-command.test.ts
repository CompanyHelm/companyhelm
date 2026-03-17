import { beforeEach, expect, test, vi } from "vitest";
import { PassThrough } from "node:stream";

const promptState = vi.hoisted(() => ({
  text: vi.fn(),
  confirm: vi.fn(),
  intro: vi.fn(),
  note: vi.fn(),
  outro: vi.fn(),
  spinnerStart: vi.fn(),
  spinnerStop: vi.fn(),
  spinner: vi.fn(),
  isCancel: vi.fn(() => false),
  isTTY: vi.fn((output: { isTTY?: boolean }) => Boolean(output.isTTY)),
}));

vi.mock("@clack/prompts", () => ({
  text: promptState.text,
  confirm: promptState.confirm,
  intro: promptState.intro,
  note: promptState.note,
  outro: promptState.outro,
  spinner: promptState.spinner,
  isCancel: promptState.isCancel,
  isTTY: promptState.isTTY,
}));

import { Command } from "commander";

import {
  ensureGithubAppConfig,
  promptGithubAppConfig,
  registerSetupGithubAppCommand,
  readPemFromTerminal,
} from "../../src/commands/setup-github-app.js";
import { GithubAppConfigStore } from "../../src/core/config/GithubAppConfigStore.js";

function createInteractiveStream(): PassThrough & { isTTY: boolean } {
  const stream = new PassThrough() as PassThrough & { isTTY: boolean };
  stream.isTTY = true;
  return stream;
}

beforeEach(() => {
  vi.restoreAllMocks();
  promptState.text.mockReset();
  promptState.confirm.mockReset();
  promptState.intro.mockReset();
  promptState.note.mockReset();
  promptState.outro.mockReset();
  promptState.spinnerStart.mockReset();
  promptState.spinnerStop.mockReset();
  promptState.spinner.mockReset();
  promptState.isCancel.mockClear();
  promptState.isTTY.mockClear();
  promptState.spinner.mockReturnValue({
    start: promptState.spinnerStart,
    stop: promptState.spinnerStop,
  });
  promptState.confirm.mockResolvedValue(true);
});

test("readPemFromTerminal reads multiline pem content until the end marker", async () => {
  const input = createInteractiveStream();
  const output = createInteractiveStream();
  let outputText = "";
  output.on("data", (chunk) => {
    outputText += chunk.toString();
  });

  const promise = readPemFromTerminal(input, output);
  input.write("-----BEGIN PRIVATE KEY-----\n");
  input.write("key\n");
  input.write("-----END PRIVATE KEY-----\n");

  await expect(promise).resolves.toBe(
    "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  );
  expect(outputText).toContain("Generate a private key.");
  expect(outputText).toContain("cat ~/Downloads/{your-app-name}{date}.pem | pbcopy");
  expect(outputText).toContain("paste it here");
  expect(outputText).not.toContain("-----BEGIN PRIVATE KEY-----");
  expect(outputText).not.toContain("-----END PRIVATE KEY-----");
  expect(outputText).not.toContain("\nkey\n");
});

test("setup-github-app saves the machine config from interactive prompts", async () => {
  promptState.text
    .mockResolvedValueOnce("https://github.com/apps/example-local")
    .mockResolvedValueOnce("Iv123");

  const input = createInteractiveStream();
  const output = createInteractiveStream();
  const save = vi.spyOn(GithubAppConfigStore.prototype, "save").mockReturnValue("/tmp/github-app.yaml");
  const program = new Command().name("companyhelm");
  registerSetupGithubAppCommand(program);

  const restoreStdin = Object.getOwnPropertyDescriptor(process, "stdin");
  const restoreStdout = Object.getOwnPropertyDescriptor(process, "stdout");
  Object.defineProperty(process, "stdin", { configurable: true, value: input });
  Object.defineProperty(process, "stdout", { configurable: true, value: output });

  const parsePromise = program.parseAsync(["node", "companyhelm", "setup-github-app"]);
  input.write("-----BEGIN PRIVATE KEY-----\n");
  input.write("key\n");
  input.write("-----END PRIVATE KEY-----\n");

  try {
    await parsePromise;
  } finally {
    if (restoreStdin) {
      Object.defineProperty(process, "stdin", restoreStdin);
    }
    if (restoreStdout) {
      Object.defineProperty(process, "stdout", restoreStdout);
    }
  }

  expect(save).toHaveBeenCalledWith({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });
  expect(promptState.intro).toHaveBeenCalledWith("CompanyHelm GitHub App setup");
  expect(promptState.spinnerStart).toHaveBeenCalledWith("Saving machine GitHub App config");
  expect(promptState.spinnerStop).toHaveBeenCalledWith("Saved GitHub App config to /tmp/github-app.yaml");
  expect(promptState.outro).toHaveBeenCalledWith("Saved GitHub App config to /tmp/github-app.yaml.");
});

test("promptGithubAppConfig shows the new app URL and offers to open it in the browser", async () => {
  promptState.text
    .mockResolvedValueOnce("https://github.com/apps/example-local")
    .mockResolvedValueOnce("Iv123");

  const input = createInteractiveStream();
  const output = createInteractiveStream();
  let outputText = "";
  output.on("data", (chunk) => {
    outputText += chunk.toString();
  });

  const openBrowser = vi.fn().mockResolvedValue(undefined);
  const promise = promptGithubAppConfig(input, output, openBrowser);
  input.write("-----BEGIN PRIVATE KEY-----\n");
  input.write("key\n");
  input.write("-----END PRIVATE KEY-----\n");

  await expect(promise).resolves.toEqual({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });

  expect(promptState.confirm).toHaveBeenCalledWith({
    message: "Open https://github.com/settings/apps/new in your browser now?",
    active: "Yes",
    inactive: "No",
    initialValue: true,
    input,
    output,
  });
  expect(openBrowser).toHaveBeenCalledWith("https://github.com/settings/apps/new");
  expect(promptState.text).toHaveBeenNthCalledWith(2, {
    message: "GitHub App Client ID (not the App ID)",
    input,
    output,
    validate: expect.any(Function),
  });
  expect(outputText).toContain("New app page");
  expect(outputText).toContain("https://github.com/settings/apps/new");
  expect(outputText).toContain("Agents use that app to access and work on your repositories from isolated container workspaces");
  expect(outputText).toContain("operate safely without reusing your host checkout");
  expect(outputText).toContain("GitHub App name:");
  expect(outputText).toContain("companyhelm <your deployment name>");
  expect(outputText).toContain("Public link:");
  expect(outputText).toContain("Paste your public link here");
  expect(outputText).toContain("Setup URL:");
  expect(outputText).toContain("http://localhost:4173/github/install");
  expect(outputText).toContain("Redirect on update:");
  expect(outputText).toContain("Checked");
  expect(outputText).toContain("Webhook:");
  expect(outputText).toContain("Leave it inactive and uncheck the webhook option");
  expect(outputText).toContain("Permissions:");
  expect(outputText).toContain("Grant at least Contents so CompanyHelm can download repositories");
  expect(outputText).toContain("Where can this GitHub App be installed?");
  expect(outputText).toContain("Select Any account");
});

test("ensureGithubAppConfig prompts and saves when missing in a tty", async () => {
  promptState.text
    .mockResolvedValueOnce("https://github.com/apps/example-local")
    .mockResolvedValueOnce("Iv123");

  const input = createInteractiveStream();
  const output = createInteractiveStream();
  const load = vi.spyOn(GithubAppConfigStore.prototype, "load").mockReturnValueOnce(null);
  const save = vi.spyOn(GithubAppConfigStore.prototype, "save").mockReturnValue("/tmp/github-app.yaml");

  const promise = ensureGithubAppConfig(new GithubAppConfigStore(), input, output);
  input.write("-----BEGIN PRIVATE KEY-----\n");
  input.write("key\n");
  input.write("-----END PRIVATE KEY-----\n");

  await expect(promise).resolves.toEqual({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });

  expect(load).toHaveBeenCalledOnce();
  expect(promptState.note).toHaveBeenCalled();
  expect(promptState.confirm).toHaveBeenNthCalledWith(1, {
    message: "Set up GitHub auth now?",
    active: "Set it up",
    inactive: "Skip for now",
    initialValue: false,
    input,
    output,
  });
  expect(promptState.spinnerStart).toHaveBeenCalledWith("Saving machine GitHub App config");
  expect(save).toHaveBeenCalledOnce();
  expect(promptState.outro).toHaveBeenCalledWith("GitHub App setup complete. Continuing startup.", { output });
});

test("ensureGithubAppConfig skips setup when the user declines", async () => {
  const input = createInteractiveStream();
  const output = createInteractiveStream();
  vi.spyOn(GithubAppConfigStore.prototype, "load").mockReturnValueOnce(null);
  promptState.confirm.mockResolvedValueOnce(false);

  await expect(ensureGithubAppConfig(new GithubAppConfigStore(), input, output)).resolves.toBeNull();

  expect(promptState.text).not.toHaveBeenCalled();
  expect(promptState.outro).toHaveBeenCalledWith(
    "Skipping GitHub App setup. Continuing startup without GitHub access.",
    { output }
  );
});
