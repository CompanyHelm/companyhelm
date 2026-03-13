import { readFileSync } from "node:fs";

import { expect, test } from "vitest";

test("readme documents the required commands", () => {
  const readme = readFileSync("README.md", "utf8");

  expect(readme).toContain("npx @companyhelm/cli up");
  expect(readme).toContain("npx @companyhelm/cli setup-github-app");
  expect(readme).toContain("npx @companyhelm/cli set-image-version");
  expect(readme).toContain("npx @companyhelm/cli logs api");
  expect(readme).toContain("npx @companyhelm/cli reset --yes");
  expect(readme).toContain("npm run set-image-version");
});
