import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";

import { beforeEach, expect, test, vi } from "vitest";

const promptState = vi.hoisted(() => {
  const cancelSignal = Symbol("cancel");

  return {
    cancelSignal,
    intro: vi.fn(),
    outro: vi.fn(),
    select: vi.fn(),
    spinnerStart: vi.fn(),
    spinnerStop: vi.fn(),
    spinner: vi.fn(),
    logInfo: vi.fn(),
    cancel: vi.fn(),
    isCancel: vi.fn((value: unknown) => value === cancelSignal),
    isTTY: vi.fn((output: { isTTY?: boolean }) => Boolean(output.isTTY))
  };
});

vi.mock("@clack/prompts", () => ({
  intro: promptState.intro,
  outro: promptState.outro,
  select: promptState.select,
  spinner: promptState.spinner,
  cancel: promptState.cancel,
  isCancel: promptState.isCancel,
  isTTY: promptState.isTTY,
  log: {
    info: promptState.logInfo
  }
}));

import { runSetImageVersion } from "../../src/commands/set-image-version.js";
import { LocalConfigStore } from "../../src/core/runtime/LocalConfigStore.js";
import { MANAGED_IMAGE_SERVICES, type ManagedImageService } from "../../src/core/runtime/ManagedImages.js";

function createInteractiveStream(): PassThrough {
  const stream = new PassThrough();
  Object.defineProperty(stream, "isTTY", { value: true });
  return stream;
}

beforeEach(() => {
  promptState.intro.mockReset();
  promptState.outro.mockReset();
  promptState.select.mockReset();
  promptState.spinnerStart.mockReset();
  promptState.spinnerStop.mockReset();
  promptState.spinner.mockReset();
  promptState.logInfo.mockReset();
  promptState.cancel.mockReset();
  promptState.isCancel.mockClear();
  promptState.isTTY.mockClear();
  promptState.spinner.mockReturnValue({
    start: promptState.spinnerStart,
    stop: promptState.spinnerStop
  });
});

test("uses clack prompts to select an image tag and write config.yaml", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-set-image-"));
  const input = createInteractiveStream();
  const output = createInteractiveStream();

  promptState.select.mockResolvedValueOnce("api").mockResolvedValueOnce("main-c32cd29");

  await runSetImageVersion(
    { limit: 5 },
    {
      input,
      output,
      configStore: new LocalConfigStore(projectRoot),
      registry: {
        async listAvailableTags(service: ManagedImageService) {
          return service === "api" ? ["latest", "main-c32cd29"] : ["latest", "main-8fc7844"];
        },
        buildImageReference(service: ManagedImageService, tag: string) {
          return service === "api"
            ? `public.ecr.aws/x6n0f2k4/companyhelm-api:${tag}`
            : `public.ecr.aws/x6n0f2k4/companyhelm-web:${tag}`;
        }
      }
    }
  );

  expect(fs.readFileSync(path.join(projectRoot, "config.yaml"), "utf8")).toContain(
    "api: public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29"
  );
  expect(promptState.intro).toHaveBeenCalledWith("CompanyHelm image selection", { output });
  expect(promptState.logInfo).toHaveBeenCalledWith("Current configured image for api: default (latest)", { output });
  expect(promptState.spinnerStart).toHaveBeenCalledWith("Loading the latest 5 image tags for api");
  expect(promptState.spinnerStop).toHaveBeenCalledWith("Loaded 2 image tags");
  expect(promptState.select).toHaveBeenNthCalledWith(1, {
    message: "Which image do you want to pin?",
    options: MANAGED_IMAGE_SERVICES.map((service) => ({ value: service, label: service, hint: undefined })),
    initialValue: undefined,
    input,
    output
  });
  expect(promptState.select).toHaveBeenNthCalledWith(2, {
    message: "Choose the api image tag",
    options: [
      { value: "latest", label: "latest", hint: undefined },
      { value: "main-c32cd29", label: "main-c32cd29", hint: undefined }
    ],
    initialValue: undefined,
    input,
    output
  });
  expect(promptState.outro).toHaveBeenCalledWith(
    expect.stringContaining("Updated"),
    { output }
  );
});
