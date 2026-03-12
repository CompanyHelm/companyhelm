import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import { SeedSqlRenderer } from "../../src/core/bootstrap/SeedSqlRenderer.js";

test("renders admin user and hashed runner secret", () => {
  const sql = new SeedSqlRenderer().render({
    companyId: "company-1",
    companyName: "Local CompanyHelm",
    username: "admin",
    passwordHash: "password-hash",
    runnerName: "local-runner",
    runnerSecret: "runner-secret"
  });

  expect(sql).toContain("admin");
  expect(sql).toContain("password-hash");
  expect(sql).toContain(createHash("sha256").update("runner-secret").digest("hex"));
});
