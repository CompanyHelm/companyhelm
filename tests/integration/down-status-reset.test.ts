import { expect, test, vi } from "vitest";

import { buildProgram } from "../../src/commands/register-commands.js";

test("reset requires the force flag", async () => {
  const program = buildProgram({
    up: async () => undefined,
    down: async () => undefined,
    status: async () => ({ postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }),
    logs: async () => undefined,
    reset: async () => undefined
  });

  await expect(program.parseAsync(["node", "companyhelm", "reset"])).rejects.toThrow("--force");
});

test("reset with force invokes the reset handler", async () => {
  const reset = vi.fn(async () => undefined);
  const program = buildProgram({
    up: async () => undefined,
    down: async () => undefined,
    status: async () => ({ postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }),
    logs: async () => undefined,
    reset
  });

  await program.parseAsync(["node", "companyhelm", "reset", "--force"]);

  expect(reset).toHaveBeenCalledOnce();
});
