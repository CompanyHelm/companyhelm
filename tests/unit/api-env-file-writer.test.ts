import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { ApiEnvFileWriter } from "../../src/core/config/ApiEnvFileWriter.js";

test("writes the generated api env file with github app variables", () => {
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-runtime-env-"));
  const writer = new ApiEnvFileWriter(runtimeRoot);

  const envPath = writer.write({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });

  expect(envPath).toBe(path.join(runtimeRoot, "api", ".env"));
  expect(fs.readFileSync(envPath, "utf8")).toBe(
    [
      "GITHUB_APP_URL=https://github.com/apps/example-local",
      "GITHUB_APP_CLIENT_ID=Iv123",
      "GITHUB_APP_PRIVATE_KEY_PEM=-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
      "",
    ].join("\n"),
  );
});

test("writes blank github app variables when github auth is skipped", () => {
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-runtime-env-"));
  const writer = new ApiEnvFileWriter(runtimeRoot);

  const envPath = writer.write(null);

  expect(fs.readFileSync(envPath, "utf8")).toBe(
    [
      "GITHUB_APP_URL=",
      "GITHUB_APP_CLIENT_ID=",
      "GITHUB_APP_PRIVATE_KEY_PEM=",
      "",
    ].join("\n"),
  );
});
