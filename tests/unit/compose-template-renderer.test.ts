import { expect, test } from "vitest";

import { ComposeTemplateRenderer } from "../../src/core/docker/ComposeTemplateRenderer.js";

test("renders frontend, api, and postgres with only allowed host ports", () => {
  const yaml = new ComposeTemplateRenderer().render({
    apiHttpPort: 4000,
    uiPort: 4173,
    runnerGrpcPort: 50051,
    agentCliGrpcPort: 50052
  }, {
    apiConfigPath: "/tmp/companyhelm/api-config.yaml",
    apiEnvPath: "/tmp/project/.companyhelm/api/.env",
    frontendConfigPath: "/tmp/companyhelm/frontend-config.yaml",
    seedFilePath: "/tmp/companyhelm/seed.sql"
  });

  expect(yaml).toContain("frontend:");
  expect(yaml).toMatch(/image: .*companyhelm-api:/);
  expect(yaml).toMatch(/image: .*companyhelm-web:/);
  expect(yaml).toContain("platform: linux/amd64");
  expect(yaml.match(/platform: linux\/amd64/g)).toHaveLength(1);
  expect(yaml).toContain('"4000:4000"');
  expect(yaml).toContain('"4173:4173"');
  expect(yaml).toContain('"50051:50051"');
  expect(yaml).not.toContain('"50052:50052"');
  expect(yaml).toContain('"/tmp/project/.companyhelm/api/.env"');
  expect(yaml).toContain('"/tmp/companyhelm/frontend-config.yaml:/run/companyhelm/config.yaml:ro"');
  expect(yaml).toContain('"/tmp/companyhelm/api-config.yaml:/run/companyhelm/config.yaml:ro"');
  expect(yaml).toContain('"/tmp/companyhelm/seed.sql:/run/companyhelm/seed.sql:ro"');
});

test("renders frontend log level overrides into the compose environment", () => {
  const yaml = new ComposeTemplateRenderer().render({
    apiHttpPort: 4000,
    uiPort: 4173,
    runnerGrpcPort: 50051,
    agentCliGrpcPort: 50052
  }, {
    apiConfigPath: "/tmp/companyhelm/api-config.yaml",
    apiEnvPath: "/tmp/project/.companyhelm/api/.env",
    frontendConfigPath: "/tmp/companyhelm/frontend-config.yaml",
    seedFilePath: "/tmp/companyhelm/seed.sql"
  }, {
    frontendLogLevel: "debug"
  });

  expect(yaml).toContain('COMPANYHELM_LOG_LEVEL: "debug"');
  expect(yaml).toContain('npm_config_loglevel: "debug"');
});

test("omits docker api and frontend services when local repo mode selects them", () => {
  const yaml = new ComposeTemplateRenderer().render({
    apiHttpPort: 4000,
    uiPort: 4173,
    runnerGrpcPort: 50051,
    agentCliGrpcPort: 50052
  }, {
    apiConfigPath: "/tmp/companyhelm/api-config.yaml",
    apiEnvPath: "/tmp/project/.companyhelm/api/.env",
    frontendConfigPath: "/tmp/companyhelm/frontend-config.yaml",
    seedFilePath: "/tmp/companyhelm/seed.sql"
  }, {
    includeApi: false,
    includeFrontend: false,
    exposePostgresPort: true
  });

  expect(yaml).not.toContain("\n  api:\n");
  expect(yaml).not.toContain("\n  frontend:\n");
  expect(yaml).toContain('"5432:5432"');
});
