import { readFileSync } from "node:fs";

import { expect, test } from "vitest";

test("readme documents the required commands", () => {
  const readme = readFileSync("README.md", "utf8");

  expect(readme).toContain("companyhelm up");
  expect(readme).toContain("companyhelm logs <service>");
  expect(readme).toContain("companyhelm reset --force");
});
