import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { ApiEnvFileWriter } from "../../src/core/config/ApiEnvFileWriter.js";

test("writes the generated api env file with github app variables", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-project-env-"));
  const writer = new ApiEnvFileWriter(projectRoot);

  const envPath = writer.write({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });

  expect(envPath).toBe(path.join(projectRoot, ".companyhelm", "api", ".env"));
  expect(fs.readFileSync(envPath, "utf8")).toBe(
    [
      "GITHUB_APP_URL=https://github.com/apps/example-local",
      "GITHUB_APP_CLIENT_ID=Iv123",
      "GITHUB_APP_PRIVATE_KEY_PEM=-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
      "",
    ].join("\n"),
  );
});
