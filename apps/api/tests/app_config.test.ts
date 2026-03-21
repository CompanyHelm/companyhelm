import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ConfigLoader } from "../src/config/loader.ts";
import { Config } from "../src/config/schema.ts";

/**
 * Creates isolated config fixtures so the shared Config loader can be exercised with the API schema.
 */
class AppConfigTestHarness {
  static createFixtureConfigPath(provider: "companyhelm" | "supabase" = "companyhelm"): {
    configPath: string;
    privateKeyVariableName: string;
    publicKeyVariableName: string;
    githubClientVariableName: string;
    githubKeyVariableName: string;
    githubUrlVariableName: string;
  } {
    const fixturePath = mkdtempSync(join(tmpdir(), "companyhelm-config-"));
    const configDirectoryPath = join(fixturePath, "config");
    const configPath = join(configDirectoryPath, "local.yaml");
    const privateKeyVariableName = "COMPANYHELM_TEST_PRIVATE_KEY";
    const publicKeyVariableName = "COMPANYHELM_TEST_PUBLIC_KEY";
    const githubClientVariableName = "COMPANYHELM_TEST_GITHUB_CLIENT";
    const githubKeyVariableName = "COMPANYHELM_TEST_GITHUB_KEY";
    const githubUrlVariableName = "COMPANYHELM_TEST_GITHUB_URL";

    process.env[privateKeyVariableName] = "private-key";
    process.env[publicKeyVariableName] = "public-key";
    process.env[githubClientVariableName] = "client-id";
    process.env[githubKeyVariableName] = "private-key-pem";
    process.env[githubUrlVariableName] = "https://github.example/app";

    mkdirSync(configDirectoryPath, { recursive: true });
    writeFileSync(
      configPath,
      AppConfigTestHarness.createConfigDocument({
        provider,
        githubClientVariableName,
        githubKeyVariableName,
        githubUrlVariableName,
        privateKeyVariableName,
        publicKeyVariableName,
      }),
      "utf8",
    );

    return {
      configPath,
      privateKeyVariableName,
      publicKeyVariableName,
      githubClientVariableName,
      githubKeyVariableName,
      githubUrlVariableName,
    };
  }

  private static createConfigDocument(params: {
    provider: "companyhelm" | "supabase";
    githubClientVariableName: string;
    githubKeyVariableName: string;
    githubUrlVariableName: string;
    privateKeyVariableName: string;
    publicKeyVariableName: string;
  }): string {
    const authDocument = params.provider === "companyhelm"
      ? `
auth:
  provider: "companyhelm"
  companyhelm:
    jwt_private_key_pem: "\${${params.privateKeyVariableName}}"
    jwt_public_key_pem: "\${${params.publicKeyVariableName}}"
    jwt_issuer: "companyhelm.local"
    jwt_audience: "companyhelm-web"
    jwt_expiration_seconds: 86400
`.trim()
      : `
auth:
  provider: "supabase"
  supabase:
    url: "https://example.supabase.co"
    anon_key: "supabase-anon-key"
`.trim();

    return `
host: "127.0.0.1"
port: 4000
graphql:
  endpoint: "/graphql"
  graphiql: true
publicUrl: "http://localhost:4000"
database:
  name: "postgres"
  host: "127.0.0.1"
  port: 5432
  roles:
    app_runtime:
      username: "app-runtime"
      password: "runtime-password"
    admin:
      username: "postgres"
      password: "postgres"
redis:
  host: "127.0.0.1"
  port: 6379
github:
  app_client_id: "\${${params.githubClientVariableName}}"
  app_private_key_pem: "\${${params.githubKeyVariableName}}"
  app_link: "\${${params.githubUrlVariableName}}"
${authDocument}
security:
  encryption:
    key: "companyhelm-local-encryption-key"
log_level: "debug"
log_pretty: true
`.trimStart();
  }
}

test("AppConfig loads Fastify runtime settings from local.yaml", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const config = ConfigLoader.loadFromPath(fixture.configPath, Config);
  const document = config.getDocument();

  assert.deepEqual({
    host: document.host,
    port: document.port,
  }, {
    host: "127.0.0.1",
    port: 4000,
  });
  assert.deepEqual({
    logger: {
      level: document.log_level,
    },
  }, {
    logger: {
      level: "debug",
    },
  });
  assert.deepEqual(document.redis, {
    host: "127.0.0.1",
    port: 6379,
  });
  assert.equal(document.github.app_client_id, "client-id");
  assert.equal(
    document.auth.companyhelm?.jwt_private_key_pem,
    "private-key",
  );
});

test("AppConfig loads Supabase auth settings from local.yaml", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath("supabase");
  const config = ConfigLoader.loadFromPath(fixture.configPath, Config);
  const document = config.getDocument();

  assert.equal(document.auth.provider, "supabase");
  assert.equal(document.auth.supabase?.url, "https://example.supabase.co");
  assert.equal(document.auth.supabase?.anon_key, "supabase-anon-key");
});

test("AppConfig explains how to provide missing environment variables", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const originalGithubClientId = process.env[fixture.githubClientVariableName];

  delete process.env[fixture.githubClientVariableName];

  try {
    assert.throws(
      () => ConfigLoader.loadFromPath(fixture.configPath, Config),
      /Missing environment variable "COMPANYHELM_TEST_GITHUB_CLIENT"\./,
    );
  } finally {
    if (originalGithubClientId) {
      process.env[fixture.githubClientVariableName] = originalGithubClientId;
    }
  }
});
