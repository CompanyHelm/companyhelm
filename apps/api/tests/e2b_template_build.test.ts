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
    computerUse: true,
    template,
    templateId: "small",
  });
  const templateBuildSpy = vi.spyOn(Template, "build").mockResolvedValue(buildInfo);

  const result = await build.build("configured-e2b-api-key", "realequityapps/");
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
  assert.equal(buildCall[1], "realequityapps/small");
  assert.equal(buildCall[2].apiKey, "configured-e2b-api-key");
  assert.equal(buildCall[2].cpuCount, 1);
  assert.equal(buildCall[2].memoryMB, 1024);
  assert.equal(typeof buildCall[2].onBuildLogs, "function");
  templateBuildSpy.mockRestore();
});

test("E2bTemplateBuild exposes the local environment template metadata", () => {
  const build = new E2bTemplateBuild({
    cpuCount: 2,
    memoryMB: 4096,
    computerUse: true,
    template: Template().fromBaseImage(),
    templateId: "medium",
  });

  assert.deepEqual(build.toEnvironmentTemplate(), {
    computerUse: true,
    cpuCount: 2,
    diskSpaceGb: 20,
    memoryGb: 4,
    name: "medium",
    templateId: "medium",
  });
  assert.equal(build.resolveTemplateReference("realequityapps/"), "realequityapps/medium");
});

test("E2bTemplateBuild exposes provider-specific computer-use tools only for computer-use templates", () => {
  const mediumBuild = new E2bTemplateBuild({
    cpuCount: 2,
    memoryMB: 4096,
    computerUse: true,
    template: Template().fromBaseImage(),
    templateId: "medium",
  });
  const smallBuild = new E2bTemplateBuild({
    cpuCount: 1,
    memoryMB: 2048,
    computerUse: false,
    template: Template().fromBaseImage(),
    templateId: "small",
  });

  const mediumProviders = mediumBuild.getTools({
    config: {
      companyhelm: {
        e2b: {
          desktop_resolution: {
            height: 1080,
            width: 1920,
          },
        },
      },
    } as never,
    computeProviderDefinitionService: {} as never,
    promptScope: {} as never,
    transactionProvider: {} as never,
  });
  const smallProviders = smallBuild.getTools({
    config: {
      companyhelm: {
        e2b: {
          desktop_resolution: {
            height: 1080,
            width: 1920,
          },
        },
      },
    } as never,
    computeProviderDefinitionService: {} as never,
    promptScope: {} as never,
    transactionProvider: {} as never,
  });

  assert.deepEqual(
    mediumProviders[0]?.createToolDefinitions().map((tool) => tool.name),
    [
      "computer_screenshot",
      "computer_get_screen_size",
      "computer_get_cursor_position",
      "computer_move_mouse",
      "computer_left_click",
      "computer_double_click",
      "computer_right_click",
      "computer_middle_click",
      "computer_mouse_press",
      "computer_mouse_release",
      "computer_drag",
      "computer_scroll",
      "computer_write",
      "computer_press",
      "computer_wait_and_verify",
      "computer_open",
      "computer_launch",
      "computer_get_current_window_id",
      "computer_get_application_windows",
      "computer_get_window_title",
    ],
  );
  assert.deepEqual(smallProviders, []);
});
