import { beforeEach, expect, test, vi } from "vitest";
import { PassThrough } from "node:stream";

const promptState = vi.hoisted(() => {
  const cancelSignal = Symbol("cancel");

  return {
    cancelSignal,
    confirm: vi.fn(),
    cancel: vi.fn(),
    isCancel: vi.fn((value: unknown) => value === cancelSignal),
    isTTY: vi.fn((output: { isTTY?: boolean }) => Boolean(output.isTTY))
  };
});

vi.mock("@clack/prompts", () => ({
  confirm: promptState.confirm,
  cancel: promptState.cancel,
  isCancel: promptState.isCancel,
  isTTY: promptState.isTTY
}));

import { buildProgram } from "../../src/commands/register-commands.js";
import { confirmRemoveGithubAppConfig, confirmReset } from "../../src/commands/reset.js";
import { GithubAppConfigStore } from "../../src/core/config/GithubAppConfigStore.js";

function createInteractiveStream(): PassThrough & { isTTY: boolean } {
  const stream = new PassThrough() as PassThrough & { isTTY: boolean };
  stream.isTTY = true;
  return stream;
}

beforeEach(() => {
  promptState.confirm.mockReset();
  promptState.cancel.mockReset();
  promptState.isCancel.mockClear();
  promptState.isTTY.mockClear();
});

function setIsTty(target: { isTTY?: boolean }, value: boolean): () => void {
  const originalDescriptor = Object.getOwnPropertyDescriptor(target, "isTTY");
  Object.defineProperty(target, "isTTY", {
    configurable: true,
    value
  });

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(target, "isTTY", originalDescriptor);
      return;
    }

    delete target.isTTY;
  };
}

test("reset supports --yes to skip confirmation", async () => {
  const reset = vi.fn(async () => undefined);
  const program = buildProgram({
    up: async () => undefined,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset
  });

  await program.parseAsync(["node", "companyhelm", "reset", "--yes"]);

  expect(reset).toHaveBeenCalledOnce();
  expect(reset).toHaveBeenCalledWith({ removeGithubAppConfig: false });
});

test("confirmReset accepts an explicit yes answer", async () => {
  const input = createInteractiveStream();
  const output = createInteractiveStream();
  promptState.confirm.mockResolvedValueOnce(true);

  await expect(confirmReset(input, output)).resolves.toBe(true);
  expect(promptState.confirm).toHaveBeenCalledWith({
    message: "This will remove CompanyHelm containers, Postgres data, generated runtime files under ~/.companyhelm/cli/runtime, and the CLI workspace config under ~/.companyhelm/cli/config.yaml. Continue?",
    active: "Yes",
    inactive: "No",
    initialValue: false,
    input,
    output
  });
});

test("confirmRemoveGithubAppConfig returns false when no machine config exists", async () => {
  const input = createInteractiveStream();
  const output = createInteractiveStream();
  const store = new GithubAppConfigStore();
  vi.spyOn(store, "hasConfig").mockReturnValue(false);

  await expect(confirmRemoveGithubAppConfig(store, input, output)).resolves.toBe(false);
  expect(promptState.confirm).not.toHaveBeenCalled();
});

test("confirmReset rejects non-interactive use without --yes", async () => {
  const input = new PassThrough() as PassThrough & { isTTY: boolean };
  input.isTTY = false;
  const output = new PassThrough() as PassThrough & { isTTY: boolean };
  output.isTTY = false;

  await expect(confirmReset(input, output)).rejects.toThrow(
    "reset requires confirmation from a TTY. Re-run with --yes to skip the prompt."
  );
});

test("reset without --yes cancels when the user declines", async () => {
  const reset = vi.fn(async () => undefined);
  promptState.confirm.mockResolvedValueOnce(false);
  const program = buildProgram({
    up: async () => undefined,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset
  });

  const restoreStdin = setIsTty(process.stdin, true);
  const restoreStdout = setIsTty(process.stdout, true);

  try {
    await program.parseAsync(["node", "companyhelm", "reset"]);
  } finally {
    restoreStdin();
    restoreStdout();
  }

  expect(reset).not.toHaveBeenCalled();
  expect(promptState.cancel).toHaveBeenCalledWith("Reset cancelled.");
});

test("reset without --yes asks whether to remove the machine GitHub App config", async () => {
  const reset = vi.fn(async () => undefined);
  promptState.confirm
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true);
  vi.spyOn(GithubAppConfigStore.prototype, "hasConfig").mockReturnValue(true);
  vi.spyOn(GithubAppConfigStore.prototype, "configPath").mockReturnValue("/tmp/github-app.yaml");
  const program = buildProgram({
    up: async () => undefined,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset
  });

  const restoreStdin = setIsTty(process.stdin, true);
  const restoreStdout = setIsTty(process.stdout, true);

  try {
    await program.parseAsync(["node", "companyhelm", "reset"]);
  } finally {
    restoreStdin();
    restoreStdout();
  }

  expect(promptState.confirm).toHaveBeenNthCalledWith(2, {
    message: "Also remove the machine GitHub App config at /tmp/github-app.yaml?",
    active: "Remove it",
    inactive: "Keep it",
    initialValue: false,
    input: process.stdin,
    output: process.stdout
  });
  expect(reset).toHaveBeenCalledWith({ removeGithubAppConfig: true });
});

test("reset supports removing machine GitHub App config with --yes", async () => {
  const reset = vi.fn(async () => undefined);
  const program = buildProgram({
    up: async () => undefined,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs: async () => undefined,
    reset
  });

  await program.parseAsync(["node", "companyhelm", "reset", "--yes", "--remove-github-app-config"]);

  expect(reset).toHaveBeenCalledOnce();
  expect(reset).toHaveBeenCalledWith({ removeGithubAppConfig: true });
});

test("logs without a service prints the available service list", async () => {
  const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const logs = vi.fn(async () => undefined);
  const program = buildProgram({
    up: async () => undefined,
    down: async () => undefined,
    status: async () => ({
      services: { postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }
    }),
    logs,
    reset: async () => undefined
  });

  await program.parseAsync(["node", "companyhelm", "logs"]);

  expect(logs).not.toHaveBeenCalled();
  expect(stdoutWrite).toHaveBeenCalledWith(
    "Available services:\n- postgres\n- companyhelm-api\n- companyhelm-web\n- companyhelm-runner\n"
  );

  stdoutWrite.mockRestore();
});
