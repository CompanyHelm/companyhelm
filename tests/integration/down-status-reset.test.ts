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
