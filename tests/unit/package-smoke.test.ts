import { existsSync } from "node:fs";
import { expect, test } from "vitest";

test("package manifest exists", () => {
  expect(existsSync("package.json")).toBe(true);
});
