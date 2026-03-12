import { expect, test } from "vitest";

import { ComposeTemplateRenderer } from "../../src/core/docker/ComposeTemplateRenderer.js";

test("renders frontend, api, and postgres with only allowed host ports", () => {
  const yaml = new ComposeTemplateRenderer().render({
    uiPort: 4173,
    runnerGrpcPort: 5051,
    agentCliGrpcPort: 5052
  });

  expect(yaml).toContain("frontend:");
  expect(yaml).toContain('"4173:4173"');
  expect(yaml).toContain('"5051:5051"');
  expect(yaml).toContain('"5052:5052"');
  expect(yaml).not.toContain("5432:5432");
});
