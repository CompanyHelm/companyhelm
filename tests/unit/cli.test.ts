import { beforeEach, expect, test, vi } from "vitest";

const parseAsync = vi.fn();

vi.mock("../../src/commands/register-commands.js", () => ({
  buildProgram: vi.fn(() => ({
    parseAsync
  }))
}));

import { main } from "../../src/cli.js";

beforeEach(() => {
  parseAsync.mockReset();
  vi.restoreAllMocks();
});

test("prints a plain error message instead of throwing a stack for command failures", async () => {
  parseAsync.mockRejectedValue(new Error("preflight failed"));
  const stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

  await main(["node", "companyhelm", "up"]);

  expect(stderrWrite).toHaveBeenCalledWith("preflight failed\n");
  expect(process.exitCode).toBe(1);
});
