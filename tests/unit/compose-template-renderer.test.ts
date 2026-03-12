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
    frontendConfigPath: "/tmp/companyhelm/frontend-config.yaml",
    seedFilePath: "/tmp/companyhelm/seed.sql"
  });

  expect(yaml).toContain("frontend:");
  expect(yaml).toContain("image: public.ecr.aws/x6n0f2k4/companyhelm-api:latest");
  expect(yaml).toContain("image: public.ecr.aws/x6n0f2k4/companyhelm-web:latest");
  expect(yaml).toContain("platform: linux/amd64");
  expect(yaml.match(/platform: linux\/amd64/g)).toHaveLength(1);
  expect(yaml).toContain('"4000:4000"');
  expect(yaml).toContain('"4173:4173"');
  expect(yaml).toContain('"50051:50051"');
  expect(yaml).toContain('"50052:50052"');
  expect(yaml).toContain('"/tmp/companyhelm/frontend-config.yaml:/run/companyhelm/config.yaml:ro"');
  expect(yaml).toContain('"/tmp/companyhelm/api-config.yaml:/run/companyhelm/config.yaml:ro"');
  expect(yaml).toContain('"/tmp/companyhelm/seed.sql:/run/companyhelm/seed.sql:ro"');
});
