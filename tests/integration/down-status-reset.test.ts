import { expect, test, vi } from "vitest";
import { PassThrough } from "node:stream";

import { buildProgram } from "../../src/commands/register-commands.js";
import { confirmReset } from "../../src/commands/reset.js";

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
  const input = new PassThrough() as PassThrough & { isTTY: boolean };
  input.isTTY = true;
  const output = new PassThrough();
  input.end("yes\n");

  await expect(confirmReset(input, output)).resolves.toBe(true);
});

test("confirmReset rejects non-interactive use without --yes", async () => {
  const input = new PassThrough() as PassThrough & { isTTY: boolean };
  input.isTTY = false;
  const output = new PassThrough();

  await expect(confirmReset(input, output)).rejects.toThrow(
    "reset requires confirmation from a TTY. Re-run with --yes to skip the prompt."
  );
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
