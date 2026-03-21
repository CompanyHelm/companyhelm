import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AppConfig } from "../../src/config/config.ts";

/**
 * Creates isolated config fixtures so AppConfig can be exercised from the public config path.
 */
class AppConfigTestHarness {
  static createFixtureConfigPath(): {
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
      `
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
github:
  app_client_id: "\${${githubClientVariableName}}"
  app_private_key_pem: "\${${githubKeyVariableName}}"
  app_link: "\${${githubUrlVariableName}}"
auth:
  provider: "companyhelm"
  companyhelm:
    jwt_private_key_pem: "\${${privateKeyVariableName}}"
    jwt_public_key_pem: "\${${publicKeyVariableName}}"
    jwt_issuer: "companyhelm.local"
    jwt_audience: "companyhelm-web"
    jwt_expiration_seconds: 86400
security:
  encryption:
    key: "companyhelm-local-encryption-key"
log_level: "debug"
log_pretty: true
`.trimStart(),
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
}

test("AppConfig loads Fastify runtime settings from local.yaml", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const config = AppConfig.loadFromPath(fixture.configPath);

  assert.deepEqual(config.getListenOptions(), {
    host: "127.0.0.1",
    port: 4000,
  });
  assert.deepEqual(config.getFastifyOptions(), {
    logger: {
      level: "debug",
    },
  });
  assert.equal(config.getDocument().github.app_client_id, "client-id");
  assert.equal(
    config.getDocument().auth.companyhelm?.jwt_private_key_pem,
    "private-key",
  );
});
