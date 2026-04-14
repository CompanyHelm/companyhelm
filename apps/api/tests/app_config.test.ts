import "reflect-metadata";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import { ConfigLoader } from "../src/config/config_loader.ts";
import { ConfigDocument } from "../src/config/schema.ts";

/**
 * Creates isolated config fixtures so the shared Config loader can be exercised with the API schema.
 */
class AppConfigTestHarness {
  static createFixtureConfigPath(): {
    companyHelmE2bApiKeyVariableName: string;
    configPath: string;
    clerkSecretKeyVariableName: string;
    clerkPublishableKeyVariableName: string;
    clerkJwksUrlVariableName: string;
    githubClientSecretVariableName: string;
    exaApiKeyVariableName: string;
    githubClientVariableName: string;
    githubKeyIdVariableName: string;
    githubKeyVariableName: string;
    githubUrlVariableName: string;
  } {
    const fixturePath = mkdtempSync(join(tmpdir(), "companyhelm-config-"));
    const configDirectoryPath = join(fixturePath, "config");
    const configPath = join(configDirectoryPath, "local.yaml");
    const clerkSecretKeyVariableName = "COMPANYHELM_TEST_CLERK_SECRET_KEY";
    const clerkPublishableKeyVariableName = "COMPANYHELM_TEST_CLERK_PUBLISHABLE_KEY";
    const clerkJwksUrlVariableName = "COMPANYHELM_TEST_CLERK_JWKS_URL";
    const githubClientVariableName = "COMPANYHELM_TEST_GITHUB_CLIENT";
    const githubClientSecretVariableName = "COMPANYHELM_TEST_GITHUB_CLIENT_SECRET";
    const githubKeyIdVariableName = "COMPANYHELM_TEST_GITHUB_KEY_ID";
    const githubKeyVariableName = "COMPANYHELM_TEST_GITHUB_KEY";
    const githubUrlVariableName = "COMPANYHELM_TEST_GITHUB_URL";
    const exaApiKeyVariableName = "COMPANYHELM_TEST_EXA_API_KEY";
    const companyHelmE2bApiKeyVariableName = "COMPANYHELM_TEST_E2B_API_KEY";

    process.env[clerkSecretKeyVariableName] = "clerk-secret-key";
    process.env[clerkPublishableKeyVariableName] = "clerk-publishable-key";
    process.env[clerkJwksUrlVariableName] = "https://clerk.example/.well-known/jwks.json";
    process.env[githubClientVariableName] = "client-id";
    process.env[githubClientSecretVariableName] = "client-secret";
    process.env[githubKeyIdVariableName] = "github-state-key";
    process.env[githubKeyVariableName] = "private-key-pem";
    process.env[githubUrlVariableName] = "https://github.example/app";
    process.env[exaApiKeyVariableName] = "exa-local-api-key";
    process.env[companyHelmE2bApiKeyVariableName] = "e2b-local-api-key";

    mkdirSync(configDirectoryPath, { recursive: true });
    writeFileSync(
      configPath,
      AppConfigTestHarness.createConfigDocument({
        companyHelmE2bApiKeyVariableName,
        githubClientVariableName,
        githubClientSecretVariableName,
        githubKeyIdVariableName,
        githubKeyVariableName,
        githubUrlVariableName,
        exaApiKeyVariableName,
        clerkSecretKeyVariableName,
        clerkPublishableKeyVariableName,
        clerkJwksUrlVariableName,
      }),
      "utf8",
    );

    return {
      companyHelmE2bApiKeyVariableName,
      configPath,
      clerkSecretKeyVariableName,
      clerkPublishableKeyVariableName,
      clerkJwksUrlVariableName,
      githubClientSecretVariableName,
      githubClientVariableName,
      githubKeyIdVariableName,
      githubKeyVariableName,
      githubUrlVariableName,
      exaApiKeyVariableName,
    };
  }

  private static createConfigDocument(params: {
    companyHelmE2bApiKeyVariableName: string;
    githubClientVariableName: string;
    githubClientSecretVariableName: string;
    githubKeyIdVariableName: string;
    githubKeyVariableName: string;
    githubUrlVariableName: string;
    exaApiKeyVariableName: string;
    clerkSecretKeyVariableName: string;
    clerkPublishableKeyVariableName: string;
    clerkJwksUrlVariableName: string;
  }): string {
    const authDocument = `
auth:
  provider: "clerk"
  clerk:
    secret_key: "\${${params.clerkSecretKeyVariableName}}"
    publishable_key: "\${${params.clerkPublishableKeyVariableName}}"
    jwks_url: "\${${params.clerkJwksUrlVariableName}}"
    authorized_parties:
      - "http://localhost:5173"
`.trim();

    return `
host: "127.0.0.1"
port: 4000
cors:
  origin:
    - "http://127.0.0.1:5173"
    - "http://localhost:5173"
  credentials: true
  methods:
    - "GET"
    - "POST"
    - "OPTIONS"
  allowed_headers:
    - "content-type"
    - "authorization"
graphql:
  endpoint: "/graphql"
  graphiql: true
publicUrl: "http://localhost:4000"
webPublicUrl: "http://localhost:5173"
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
  username: ""
  password: ""
workers:
  session_process:
    concurrency: 4
web_search:
  exa:
    api_key: "\${${params.exaApiKeyVariableName}}"
companyhelm:
  e2b:
    api_key: "\${${params.companyHelmE2bApiKeyVariableName}}"
    desktop_resolution:
      width: 1920
      height: 1080
    template_prefix: "realequityapps/"
github:
  app_client_id: "\${${params.githubClientVariableName}}"
  app_client_secret: "\${${params.githubClientSecretVariableName}}"
  key_id: "\${${params.githubKeyIdVariableName}}"
  app_private_key_pem: "\${${params.githubKeyVariableName}}"
  app_link: "\${${params.githubUrlVariableName}}"
${authDocument}
security:
  encryption:
    key: "companyhelm-local-encryption-key"
    key_id: "companyhelm-local-key"
log:
  level: "debug"
`.trimStart();
  }
}

test("AppConfig loads Fastify runtime settings from local.yaml", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const document = ConfigLoader.load(fixture.configPath, ConfigDocument);

  assert.deepEqual({
    host: document.host,
    port: document.port,
  }, {
    host: "127.0.0.1",
    port: 4000,
  });
  assert.deepEqual(document.cors, {
    origin: [
      "http://127.0.0.1:5173",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: [
      "GET",
      "POST",
      "OPTIONS",
    ],
    allowed_headers: [
      "content-type",
      "authorization",
    ],
  });
  assert.deepEqual({
    logger: {
      level: document.log.level,
      json: document.log.json,
    },
  }, {
    logger: {
      level: "debug",
      json: false,
    },
  });
  assert.deepEqual(document.redis, {
    host: "127.0.0.1",
    port: 6379,
    username: "",
    password: "",
  });
  assert.deepEqual(document.workers, {
    session_process: {
      concurrency: 4,
    },
  });
  assert.deepEqual(document.security.encryption, {
    key: "companyhelm-local-encryption-key",
    key_id: "companyhelm-local-key",
  });
  assert.equal(document.companyhelm.e2b.api_key, "e2b-local-api-key");
  assert.deepEqual(document.companyhelm.e2b.desktop_resolution, {
    height: 1080,
    width: 1920,
  });
  assert.equal(document.github.app_client_id, "client-id");
  assert.equal(document.github.app_client_secret, "client-secret");
  assert.equal(document.github.public_repository_token, undefined);
  assert.equal(document.github.key_id, "github-state-key");
  assert.equal(document.web_search.exa.api_key, "exa-local-api-key");
  assert.equal(document.auth.provider, "clerk");
  assert.equal(document.auth.clerk?.secret_key, "clerk-secret-key");
});

test("AppConfig loads Clerk auth settings from local.yaml", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const document = ConfigLoader.load(fixture.configPath, ConfigDocument);

  assert.equal(document.auth.provider, "clerk");
  assert.equal(document.auth.clerk?.secret_key, "clerk-secret-key");
  assert.equal(document.auth.clerk?.publishable_key, "clerk-publishable-key");
  assert.equal(document.auth.clerk?.jwks_url, "https://clerk.example/.well-known/jwks.json");
  assert.deepEqual(document.auth.clerk?.authorized_parties, ["http://localhost:5173"]);
  assert.equal(document.log.json, false);
});

test("AppConfig explains how to provide missing environment variables", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const originalGithubClientId = process.env[fixture.githubClientVariableName];

  delete process.env[fixture.githubClientVariableName];

  try {
    assert.throws(
      () => ConfigLoader.load(fixture.configPath, ConfigDocument),
      /Missing environment variable "COMPANYHELM_TEST_GITHUB_CLIENT"\./,
    );
  } finally {
    if (originalGithubClientId) {
      process.env[fixture.githubClientVariableName] = originalGithubClientId;
    }
  }
});
