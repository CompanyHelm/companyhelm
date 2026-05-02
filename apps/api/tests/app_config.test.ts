import "reflect-metadata";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
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
    exaApiKeyVariableName: string;
    githubClientVariableName: string;
    githubKeyIdVariableName: string;
    githubKeyVariableName: string;
    githubUrlVariableName: string;
    githubWebhookSecretVariableName: string;
  } {
    const fixturePath = mkdtempSync(join(tmpdir(), "companyhelm-config-"));
    const configDirectoryPath = join(fixturePath, "config");
    const configPath = join(configDirectoryPath, "local.yaml");
    const clerkSecretKeyVariableName = "COMPANYHELM_TEST_CLERK_SECRET_KEY";
    const clerkPublishableKeyVariableName = "COMPANYHELM_TEST_CLERK_PUBLISHABLE_KEY";
    const clerkJwksUrlVariableName = "COMPANYHELM_TEST_CLERK_JWKS_URL";
    const githubClientVariableName = "COMPANYHELM_TEST_GITHUB_CLIENT";
    const githubKeyIdVariableName = "COMPANYHELM_TEST_GITHUB_KEY_ID";
    const githubKeyVariableName = "COMPANYHELM_TEST_GITHUB_KEY";
    const githubUrlVariableName = "COMPANYHELM_TEST_GITHUB_URL";
    const githubWebhookSecretVariableName = "COMPANYHELM_TEST_GITHUB_WEBHOOK_SECRET";
    const exaApiKeyVariableName = "COMPANYHELM_TEST_EXA_API_KEY";
    const companyHelmE2bApiKeyVariableName = "COMPANYHELM_TEST_E2B_API_KEY";

    process.env[clerkSecretKeyVariableName] = "clerk-secret-key";
    process.env[clerkPublishableKeyVariableName] = "clerk-publishable-key";
    process.env[clerkJwksUrlVariableName] = "https://clerk.example/.well-known/jwks.json";
    process.env[githubClientVariableName] = "client-id";
    process.env[githubKeyIdVariableName] = "github-state-key";
    process.env[githubKeyVariableName] = "private-key-pem";
    process.env[githubUrlVariableName] = "https://github.example/app";
    process.env[githubWebhookSecretVariableName] = "github-webhook-secret";
    process.env[exaApiKeyVariableName] = "exa-local-api-key";
    process.env[companyHelmE2bApiKeyVariableName] = "e2b-local-api-key";

    mkdirSync(configDirectoryPath, { recursive: true });
    writeFileSync(
      configPath,
      AppConfigTestHarness.createConfigDocument({
        companyHelmE2bApiKeyVariableName,
        githubClientVariableName,
        githubKeyIdVariableName,
        githubKeyVariableName,
        githubUrlVariableName,
        githubWebhookSecretVariableName,
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
      githubClientVariableName,
      githubKeyIdVariableName,
      githubKeyVariableName,
      githubUrlVariableName,
      githubWebhookSecretVariableName,
      exaApiKeyVariableName,
    };
  }

  static createIncludedFixtureConfigPath(): {
    configPath: string;
  } {
    const fixture = AppConfigTestHarness.createFixtureConfigPath();
    const includedConfigPath = join(dirname(fixture.configPath), "local-dev.yaml");

    writeFileSync(
      includedConfigPath,
      `
include: "./local.yaml"
port: 4100
workers:
  session_process:
    concurrency: 11
log:
  level: "info"
`.trimStart(),
      "utf8",
    );

    return {
      configPath: includedConfigPath,
    };
  }

  static createIncludedFixtureConfigPathWithDotEnv(): {
    configPath: string;
  } {
    const fixturePath = mkdtempSync(join(tmpdir(), "companyhelm-config-"));
    const configDirectoryPath = join(fixturePath, "config");
    const fixtureSuffix = basename(fixturePath).replaceAll(/[^A-Za-z0-9]/g, "_").toUpperCase();
    const configPath = join(configDirectoryPath, "local-dev.yaml");
    const baseConfigPath = join(configDirectoryPath, "local.yaml");
    const baseDotEnvPath = join(fixturePath, ".env.local");
    const overrideDotEnvPath = join(fixturePath, ".env.local-dev");
    const clerkSecretKeyVariableName = `COMPANYHELM_TEST_${fixtureSuffix}_CLERK_SECRET_KEY`;
    const clerkPublishableKeyVariableName = `COMPANYHELM_TEST_${fixtureSuffix}_CLERK_PUBLISHABLE_KEY`;
    const clerkJwksUrlVariableName = `COMPANYHELM_TEST_${fixtureSuffix}_CLERK_JWKS_URL`;
    const githubClientVariableName = `COMPANYHELM_TEST_${fixtureSuffix}_GITHUB_CLIENT`;
    const githubKeyIdVariableName = `COMPANYHELM_TEST_${fixtureSuffix}_GITHUB_KEY_ID`;
    const githubKeyVariableName = `COMPANYHELM_TEST_${fixtureSuffix}_GITHUB_KEY`;
    const githubUrlVariableName = `COMPANYHELM_TEST_${fixtureSuffix}_GITHUB_URL`;
    const githubWebhookSecretVariableName = `COMPANYHELM_TEST_${fixtureSuffix}_GITHUB_WEBHOOK_SECRET`;
    const exaApiKeyVariableName = `COMPANYHELM_TEST_${fixtureSuffix}_EXA_API_KEY`;
    const companyHelmE2bApiKeyVariableName = `COMPANYHELM_TEST_${fixtureSuffix}_E2B_API_KEY`;

    mkdirSync(configDirectoryPath, { recursive: true });
    writeFileSync(
      baseConfigPath,
      AppConfigTestHarness.createConfigDocument({
        companyHelmE2bApiKeyVariableName,
        githubClientVariableName,
        githubKeyIdVariableName,
        githubKeyVariableName,
        githubUrlVariableName,
        githubWebhookSecretVariableName,
        exaApiKeyVariableName,
        clerkSecretKeyVariableName,
        clerkPublishableKeyVariableName,
        clerkJwksUrlVariableName,
      }),
      "utf8",
    );
    writeFileSync(
      configPath,
      `
include: "./local.yaml"
port: 4200
log:
  level: "warn"
`.trimStart(),
      "utf8",
    );
    writeFileSync(
      baseDotEnvPath,
      `
${clerkSecretKeyVariableName}=dotenv-base-clerk-secret-key
${clerkPublishableKeyVariableName}=dotenv-base-clerk-publishable-key
${clerkJwksUrlVariableName}=https://dotenv-base-clerk.example/.well-known/jwks.json
${githubClientVariableName}=dotenv-base-client-id
${githubKeyIdVariableName}=dotenv-base-github-state-key
${githubKeyVariableName}=dotenv-base-private-key-pem
${githubUrlVariableName}=https://dotenv-base-github.example/app
${githubWebhookSecretVariableName}=dotenv-base-github-webhook-secret
${exaApiKeyVariableName}=dotenv-base-exa-local-api-key
${companyHelmE2bApiKeyVariableName}=dotenv-base-e2b-local-api-key
`.trimStart(),
      "utf8",
    );
    writeFileSync(
      overrideDotEnvPath,
      `
${githubClientVariableName}=dotenv-override-client-id
`.trimStart(),
      "utf8",
    );

    return {
      configPath,
    };
  }

  private static createConfigDocument(params: {
    companyHelmE2bApiKeyVariableName: string;
    githubClientVariableName: string;
    githubKeyIdVariableName: string;
    githubKeyVariableName: string;
    githubUrlVariableName: string;
    githubWebhookSecretVariableName: string;
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
  company_deletions:
    concurrency: 5
  github_webhooks:
    concurrency: 3
  session_process:
    concurrency: 4
  workflow_triggers:
    concurrency: 2
agent_tools:
  read_image:
    max_source_bytes: 26214400
    max_return_bytes: 4194304
    default_resolution:
      width: 1280
      height: 1280
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
  key_id: "\${${params.githubKeyIdVariableName}}"
  app_private_key_pem: "\${${params.githubKeyVariableName}}"
  app_link: "\${${params.githubUrlVariableName}}"
  webhook_secret: "\${?${params.githubWebhookSecretVariableName}}"
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
    company_deletions: {
      concurrency: 5,
    },
    github_webhooks: {
      concurrency: 3,
    },
    llm_usage: {
      concurrency: 10,
    },
    session_process: {
      concurrency: 4,
    },
    wallet_recharges: {
      concurrency: 10,
    },
    workflow_triggers: {
      concurrency: 2,
    },
  });
  assert.deepEqual(document.agent_tools.read_image, {
    default_resolution: {
      height: 1280,
      width: 1280,
    },
    max_return_bytes: 4194304,
    max_source_bytes: 26214400,
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
  assert.equal(document.github.key_id, "github-state-key");
  assert.equal(document.github.webhook_secret, "github-webhook-secret");
  assert.equal(document.web_search.exa.api_key, "exa-local-api-key");
  assert.equal(document.auth.provider, "clerk");
  assert.equal(document.auth.clerk?.secret_key, "clerk-secret-key");
});

test("AppConfig allows local override files to include local.yaml", () => {
  const fixture = AppConfigTestHarness.createIncludedFixtureConfigPath();
  const document = ConfigLoader.load(fixture.configPath, ConfigDocument);

  assert.equal(document.port, 4100);
  assert.equal(document.log.level, "info");
  assert.deepEqual(document.workers, {
    company_deletions: {
      concurrency: 5,
    },
    github_webhooks: {
      concurrency: 3,
    },
    llm_usage: {
      concurrency: 10,
    },
    session_process: {
      concurrency: 11,
    },
    wallet_recharges: {
      concurrency: 10,
    },
    workflow_triggers: {
      concurrency: 2,
    },
  });
  assert.equal(document.github.app_client_id, "client-id");
  assert.equal(document.auth.clerk?.secret_key, "clerk-secret-key");
});

test("AppConfig loads both shared and override dotenv files for local override config files", () => {
  const fixture = AppConfigTestHarness.createIncludedFixtureConfigPathWithDotEnv();
  const document = ConfigLoader.load(fixture.configPath, ConfigDocument);

  assert.equal(document.port, 4200);
  assert.equal(document.log.level, "warn");
  assert.equal(document.github.app_client_id, "dotenv-override-client-id");
  assert.equal(document.companyhelm.e2b.api_key, "dotenv-base-e2b-local-api-key");
  assert.equal(document.auth.clerk?.secret_key, "dotenv-base-clerk-secret-key");
});

test("AppConfig allows GitHub webhook secret to be omitted", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const originalWebhookSecret = process.env[fixture.githubWebhookSecretVariableName];

  delete process.env[fixture.githubWebhookSecretVariableName];

  try {
    const document = ConfigLoader.load(fixture.configPath, ConfigDocument);
    assert.equal(document.github.webhook_secret, undefined);
  } finally {
    if (originalWebhookSecret) {
      process.env[fixture.githubWebhookSecretVariableName] = originalWebhookSecret;
    }
  }
});

test("AppConfig defaults newer worker queue concurrency when deployment config lags the schema", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const document = ConfigLoader.load(fixture.configPath, ConfigDocument);

  const parsedDocument = ConfigDocument.parse({
    ...document,
    workers: {
      session_process: document.workers.session_process,
    },
  });

  assert.deepEqual(parsedDocument.workers, {
    company_deletions: {
      concurrency: 10,
    },
    github_webhooks: {
      concurrency: 10,
    },
    llm_usage: {
      concurrency: 10,
    },
    session_process: {
      concurrency: 4,
    },
    wallet_recharges: {
      concurrency: 10,
    },
    workflow_triggers: {
      concurrency: 10,
    },
  });
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

test("AppConfig accepts local auth settings", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const document = ConfigLoader.load(fixture.configPath, ConfigDocument);
  const parsedDocument = ConfigDocument.parse({
    ...document,
    auth: {
      local: {
        password_pepper: "companyhelm-local-pepper",
        session_duration_hours: 72,
        session_issuer: "companyhelm.local",
        session_secret: "companyhelm-local-session-secret",
      },
      provider: "local",
    },
  });

  assert.equal(parsedDocument.auth.provider, "local");
  assert.equal(parsedDocument.auth.local.session_duration_hours, 72);
  assert.equal(parsedDocument.auth.local.session_issuer, "companyhelm.local");
});

test("AppConfig accepts dev auth settings", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const document = ConfigLoader.load(fixture.configPath, ConfigDocument);
  const parsedDocument = ConfigDocument.parse({
    ...document,
    auth: {
      dev: {},
      provider: "dev",
    },
  });

  assert.equal(parsedDocument.auth.provider, "dev");
  assert.deepEqual(parsedDocument.auth.dev, {});
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

test("AppConfig rejects recursive config includes", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const configDirectoryPath = dirname(fixture.configPath);
  const overrideConfigPath = join(configDirectoryPath, "local-dev.yaml");

  writeFileSync(
    fixture.configPath,
    `
include: "./local-dev.yaml"
`.trimStart(),
    "utf8",
  );
  writeFileSync(
    overrideConfigPath,
    `
include: "./local.yaml"
`.trimStart(),
    "utf8",
  );

  assert.throws(
    () => ConfigLoader.load(fixture.configPath, ConfigDocument),
    /Config include cycle detected:/,
  );
});

test("AppConfig local dev overrides Clerk auth without requiring Clerk variables", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const configDirectoryPath = dirname(fixture.configPath);
  const overrideConfigPath = join(configDirectoryPath, "local-dev.yaml");
  const originalClerkSecret = process.env[fixture.clerkSecretKeyVariableName];
  const originalClerkPublishable = process.env[fixture.clerkPublishableKeyVariableName];
  const originalClerkJwks = process.env[fixture.clerkJwksUrlVariableName];

  writeFileSync(
    overrideConfigPath,
    `
include: "./local.yaml"
publicUrl: "http://localhost:4000"
webPublicUrl: "http://localhost:5173"
auth:
  provider: "dev"
  clerk: null
  dev: {}
`.trimStart(),
    "utf8",
  );
  delete process.env[fixture.clerkSecretKeyVariableName];
  delete process.env[fixture.clerkPublishableKeyVariableName];
  delete process.env[fixture.clerkJwksUrlVariableName];

  try {
    const document = ConfigLoader.load(overrideConfigPath, ConfigDocument);

    assert.equal(document.auth.provider, "dev");
    assert.equal(document.publicUrl, "http://localhost:4000");
    assert.equal(document.webPublicUrl, "http://localhost:5173");
  } finally {
    if (originalClerkSecret) {
      process.env[fixture.clerkSecretKeyVariableName] = originalClerkSecret;
    }
    if (originalClerkPublishable) {
      process.env[fixture.clerkPublishableKeyVariableName] = originalClerkPublishable;
    }
    if (originalClerkJwks) {
      process.env[fixture.clerkJwksUrlVariableName] = originalClerkJwks;
    }
  }
});

test("AppConfig local e2b injects forwarded origins into public URLs and CORS", () => {
  const fixture = AppConfigTestHarness.createFixtureConfigPath();
  const configDirectoryPath = dirname(fixture.configPath);
  const localDevConfigPath = join(configDirectoryPath, "local-dev.yaml");
  const localE2bConfigPath = join(configDirectoryPath, "local-e2b.yaml");
  const apiUrlVariableName = "COMPANYHELM_TEST_E2B_API_PUBLIC_URL";
  const webUrlVariableName = "COMPANYHELM_TEST_E2B_WEB_PUBLIC_URL";
  process.env[apiUrlVariableName] = "https://4000-example.e2b.app";
  process.env[webUrlVariableName] = "https://5173-example.e2b.app";

  writeFileSync(
    localDevConfigPath,
    `
include: "./local.yaml"
publicUrl: "http://localhost:4000"
webPublicUrl: "http://localhost:5173"
auth:
  provider: "dev"
  clerk: null
  dev: {}
`.trimStart(),
    "utf8",
  );
  writeFileSync(
    localE2bConfigPath,
    `
include: "./local-dev.yaml"
publicUrl: "\${${apiUrlVariableName}}"
webPublicUrl: "\${${webUrlVariableName}}"
cors:
  origin:
    - "http://127.0.0.1:5173"
    - "http://localhost:5173"
    - "\${${webUrlVariableName}}"
  credentials: true
  methods:
    - "GET"
    - "POST"
    - "OPTIONS"
  allowed_headers:
    - "content-type"
    - "authorization"
    - "x-dev-user-id"
    - "x-dev-company-id"
`.trimStart(),
    "utf8",
  );

  const document = ConfigLoader.load(localE2bConfigPath, ConfigDocument);

  assert.equal(document.auth.provider, "dev");
  assert.equal(document.publicUrl, "https://4000-example.e2b.app");
  assert.equal(document.webPublicUrl, "https://5173-example.e2b.app");
  assert.deepEqual(document.cors.origin, [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://5173-example.e2b.app",
  ]);
});
