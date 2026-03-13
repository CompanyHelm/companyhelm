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
import { confirmReset } from "../../src/commands/reset.js";

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
});

test("confirmReset accepts an explicit yes answer", async () => {
  const input = createInteractiveStream();
  const output = createInteractiveStream();
  promptState.confirm.mockResolvedValueOnce(true);

  await expect(confirmReset(input, output)).resolves.toBe(true);
  expect(promptState.confirm).toHaveBeenCalledWith({
    message: "This will remove CompanyHelm containers, Postgres data, local runtime state, and generated .companyhelm/api/.env. Continue?",
    active: "Yes",
    inactive: "No",
    initialValue: false,
    input,
    output
  });
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
  expect(stdoutWrite).toHaveBeenCalledWith("Available services:\n- postgres\n- api\n- frontend\n- runner\n");

  stdoutWrite.mockRestore();
});
