import { expect, test } from "vitest";

import { buildProgram } from "../../src/commands/register-commands.js";

test("registers the initial command surface", () => {
  const program = buildProgram();

  expect(program.commands.map((command) => command.name())).toEqual([
    "up",
    "down",
    "status",
    "logs",
    "set-image-version",
    "reset"
  ]);
});
