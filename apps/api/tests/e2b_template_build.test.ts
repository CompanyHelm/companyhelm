import assert from "node:assert/strict";
import { Template, type BuildInfo } from "e2b";
import { test, vi } from "vitest";
import { E2bTemplateBuild } from "../src/compute/e2b/template_build.ts";

test("E2bTemplateBuild forwards the configured API key to Template.build", async () => {
  const buildInfo = {
    alias: "small",
    buildId: "build-1",
    name: "small",
    tags: [],
    templateId: "small",
  } satisfies BuildInfo;
  const template = Template().fromBaseImage();
  const build = new E2bTemplateBuild({
    cpuCount: 1,
    memoryMB: 1024,
    template,
    templateId: "small",
  });
  const templateBuildSpy = vi.spyOn(Template, "build").mockResolvedValue(buildInfo);

  const result = await build.build("configured-e2b-api-key");
  const buildCall = templateBuildSpy.mock.calls[0] as unknown as [
    unknown,
    string,
    {
      apiKey?: string;
      cpuCount?: number;
      memoryMB?: number;
      onBuildLogs?: unknown;
    },
  ];

  assert.equal(result, buildInfo);
  assert.equal(templateBuildSpy.mock.calls.length, 1);
  assert.equal(buildCall[0], template);
  assert.equal(buildCall[1], "small");
  assert.equal(buildCall[2].apiKey, "configured-e2b-api-key");
  assert.equal(buildCall[2].cpuCount, 1);
  assert.equal(buildCall[2].memoryMB, 1024);
  assert.equal(typeof buildCall[2].onBuildLogs, "function");
  templateBuildSpy.mockRestore();
});
