import { expect, test, vi } from "vitest";

import { buildProgram } from "../../src/commands/register-commands.js";

test("invokes the up handler", async () => {
  const up = vi.fn(async () => undefined);
  const program = buildProgram({
    up,
    down: async () => undefined,
    status: async () => ({ postgres: "stopped", api: "stopped", frontend: "stopped", runner: "stopped" }),
    logs: async () => undefined,
    reset: async () => undefined
  });

  await program.parseAsync(["node", "companyhelm", "up"]);

  expect(up).toHaveBeenCalledOnce();
});
