import { expect, test, vi } from "vitest";

import { buildProgram } from "../../src/commands/register-commands.js";

test("reset invokes the reset handler without requiring force", async () => {
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

  await program.parseAsync(["node", "companyhelm", "reset"]);

  expect(reset).toHaveBeenCalledOnce();
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
