import { existsSync } from "node:fs";

import { expect, test } from "vitest";

test("copies runtime templates into dist", () => {
  expect(existsSync("dist/templates/docker-compose.yaml.tpl")).toBe(true);
  expect(existsSync("dist/templates/seed.sql.tpl")).toBe(true);
});
