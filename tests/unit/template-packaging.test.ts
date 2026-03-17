import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

test("copies runtime templates into dist", () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  expect(existsSync(path.join(repoRoot, "dist/templates/docker-compose.yaml.tpl"))).toBe(true);
  expect(existsSync(path.join(repoRoot, "dist/templates/seed.sql.tpl"))).toBe(true);
  expect(existsSync(path.join(repoRoot, "dist/templates/api.env.tpl"))).toBe(true);
});
