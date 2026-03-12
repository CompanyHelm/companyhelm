import { readFileSync } from "node:fs";

import { expect, test } from "vitest";

test("readme documents the required commands", () => {
  const readme = readFileSync("README.md", "utf8");

  expect(readme).toContain("npx @companyhelm/cli up");
  expect(readme).toContain("npx @companyhelm/cli logs <service>");
  expect(readme).toContain("npx @companyhelm/cli reset --force");
});
