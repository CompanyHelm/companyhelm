import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const repoRoot = resolve(import.meta.dirname, "..", "..", "..");
const entrypointPath = join(repoRoot, "docker", "web", "docker-entrypoint.sh");

test("web docker entrypoint builds runtime-config.js from VITE runtime env", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "companyhelm-web-runtime-config-"));
  const runtimeConfigPath = join(tempDir, "runtime-config.js");

  try {
    execFileSync("/bin/sh", [entrypointPath, "true"], {
      env: {
        ...process.env,
        COMPANYHELM_WEB_RUNTIME_CONFIG_PATH: runtimeConfigPath,
        VITE_AUTH_PROVIDER: "local",
        VITE_GRAPHQL_URL: "https://api.companyhelm.com/graphql",
        VITE_PRIVACY_POLICY_URL: "https://companyhelm.com/privacy",
        VITE_TERMS_OF_SERVICE_URL: "https://companyhelm.com/terms",
      },
      stdio: "pipe",
    });

    const runtimeConfig = readFileSync(runtimeConfigPath, "utf8");

    assert.match(runtimeConfig, /authProvider: "local"/);
    assert.match(runtimeConfig, /graphqlUrl: "https:\/\/api\.companyhelm\.com\/graphql"/);
    assert.match(runtimeConfig, /privacyPolicyUrl: "https:\/\/companyhelm\.com\/privacy"/);
    assert.match(runtimeConfig, /termsOfServiceUrl: "https:\/\/companyhelm\.com\/terms"/);
    assert.doesNotMatch(runtimeConfig, /paddle/u);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
