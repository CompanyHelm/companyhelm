import { beforeEach, expect, test, vi } from "vitest";
import { PassThrough } from "node:stream";

const promptState = vi.hoisted(() => ({
  text: vi.fn(),
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
});

test("readPemFromTerminal reads multiline pem content until the end marker", async () => {
  const input = createInteractiveStream();
  const output = createInteractiveStream();

  const promise = readPemFromTerminal(input, output);
  input.write("-----BEGIN PRIVATE KEY-----\n");
  input.write("key\n");
  input.write("-----END PRIVATE KEY-----\n");

  await expect(promise).resolves.toBe(
    "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  );
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
  expect(promptState.spinnerStart).toHaveBeenCalledWith("Saving machine GitHub App config");
  expect(save).toHaveBeenCalledOnce();
  expect(promptState.outro).toHaveBeenCalledWith("GitHub App setup complete. Continuing startup.", { output });
});
