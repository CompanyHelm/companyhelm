import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import { ConfigLoader } from "../src/config/config_loader.ts";
import { Config } from "../src/config/schema.ts";

/**
 * Creates isolated config fixtures so the shared Config loader can be exercised with the API schema.
 */
class AppConfigTestHarness {
  static createFixtureConfigPath(provider: "companyhelm" | "clerk" = "companyhelm"): {
    configPath: string;
    privateKeyVariableName: string;
    publicKeyVariableName: string;
    clerkSecretKeyVariableName: string;
    clerkPublishableKeyVariableName: string;
    clerkJwtKeyVariableName: string;
    githubClientVariableName: string;
    githubKeyVariableName: string;
    githubUrlVariableName: string;
  } {
    const fixturePath = mkdtempSync(join(tmpdir(), "companyhelm-config-"));
    const configDirectoryPath = join(fixturePath, "config");
    const configPath = join(configDirectoryPath, "local.yaml");
    const privateKeyVariableName = "COMPANYHELM_TEST_PRIVATE_KEY";
    const publicKeyVariableName = "COMPANYHELM_TEST_PUBLIC_KEY";
    const clerkSecretKeyVariableName = "COMPANYHELM_TEST_CLERK_SECRET_KEY";
    const clerkPublishableKeyVariableName = "COMPANYHELM_TEST_CLERK_PUBLISHABLE_KEY";
    const clerkJwtKeyVariableName = "COMPANYHELM_TEST_CLERK_JWT_KEY";
    const githubClientVariableName = "COMPANYHELM_TEST_GITHUB_CLIENT";
    const githubKeyVariableName = "COMPANYHELM_TEST_GITHUB_KEY";
    const githubUrlVariableName = "COMPANYHELM_TEST_GITHUB_URL";

    process.env[privateKeyVariableName] = "private-key";
    process.env[publicKeyVariableName] = "public-key";
    process.env[clerkSecretKeyVariableName] = "clerk-secret-key";
    process.env[clerkPublishableKeyVariableName] = "clerk-publishable-key";
    process.env[clerkJwtKeyVariableName] = "clerk-jwt-key";
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
        clerkSecretKeyVariableName,
        clerkPublishableKeyVariableName,
        clerkJwtKeyVariableName,
        privateKeyVariableName,
        publicKeyVariableName,
      }),
      "utf8",
    );

    return {
      configPath,
      privateKeyVariableName,
      publicKeyVariableName,
      clerkSecretKeyVariableName,
      clerkPublishableKeyVariableName,
      clerkJwtKeyVariableName,
      githubClientVariableName,
      githubKeyVariableName,
      githubUrlVariableName,
    };
  }

  private static createConfigDocument(params: {
    provider: "companyhelm" | "clerk";
    githubClientVariableName: string;
    githubKeyVariableName: string;
    githubUrlVariableName: string;
    clerkSecretKeyVariableName: string;
    clerkPublishableKeyVariableName: string;
    clerkJwtKeyVariableName: string;
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
  provider: "clerk"
  clerk:
    secret_key: "\${${params.clerkSecretKeyVariableName}}"
    publishable_key: "\${${params.clerkPublishableKeyVariableName}}"
    jwt_key: "\${${params.clerkJwtKeyVariableName}}"
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
log:
  level: "debug"
`.trimStart();
  }
}

test("AppConfig loads Fastify runtime settings from local.yaml", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const document = ConfigLoader.load(fixture.configPath, Config);

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
  });
  assert.equal(document.github.app_client_id, "client-id");
  assert.equal(
    document.auth.companyhelm?.jwt_private_key_pem,
    "private-key",
  );
});

test("AppConfig loads Clerk auth settings from local.yaml", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath("clerk");
  const document = ConfigLoader.load(fixture.configPath, Config);

  assert.equal(document.auth.provider, "clerk");
  assert.equal(document.auth.clerk?.secret_key, "clerk-secret-key");
  assert.equal(document.auth.clerk?.publishable_key, "clerk-publishable-key");
  assert.equal(document.auth.clerk?.jwt_key, "clerk-jwt-key");
  assert.deepEqual(document.auth.clerk?.authorized_parties, ["http://localhost:5173"]);
  assert.equal(document.log.json, false);
});

test("AppConfig explains how to provide missing environment variables", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const originalGithubClientId = process.env[fixture.githubClientVariableName];

  delete process.env[fixture.githubClientVariableName];

  try {
    assert.throws(
      () => ConfigLoader.load(fixture.configPath, Config),
      /Missing environment variable "COMPANYHELM_TEST_GITHUB_CLIENT"\./,
    );
  } finally {
    if (originalGithubClientId) {
      process.env[fixture.githubClientVariableName] = originalGithubClientId;
    }
  }
});
