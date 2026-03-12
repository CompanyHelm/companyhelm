import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import { SeedSqlRenderer } from "../../src/core/bootstrap/SeedSqlRenderer.js";

test("renders admin user and hashed runner secret", () => {
  const sql = new SeedSqlRenderer().render({
    companyId: "f467d460-5839-4a84-b14a-13d0a4705ded",
    companyName: "Local CompanyHelm",
    username: "admin@local",
    passwordHash: "password-hash",
    runnerName: "local-runner",
    runnerSecret: "runner-secret"
  });

  expect(sql).toContain("admin");
  expect(sql).toContain("admin@local");
  expect(sql).toContain("password-hash");
  expect(sql).toContain(createHash("sha256").update("runner-secret").digest("hex"));
  expect(sql).toContain("'67f3a91e-ed9b-49f0-9f5d-5ba5156f96fc'");
  expect(sql).toContain("'53fb2e6b-6deb-4a24-9b59-77ec2deb1730'");
  expect(sql).toContain("'f948e32d-32e3-41da-a707-db8b149e19ac'");
});
