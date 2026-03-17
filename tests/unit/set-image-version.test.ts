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
import { MANAGED_IMAGE_SERVICES, type ManagedImageService } from "../../src/core/runtime/ManagedImages.js";
import { RepoConfigStore } from "../../src/core/runtime/RepoConfigStore.js";

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
      configStore: new RepoConfigStore(projectRoot),
      registry: {
        async listAvailableTags(service: ManagedImageService) {
          return service === "api"
            ? [
                { tag: "main-c32cd29", createdAt: "2026-03-12T05:36:25.602Z" },
                { tag: "latest", createdAt: "2026-03-13T20:48:37.557Z" }
              ]
            : [
                { tag: "main-8fc7844", createdAt: "2026-03-10T01:00:00.000Z" },
                { tag: "latest", createdAt: "2026-03-10T01:00:00.000Z" }
              ];
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
      { value: "main-c32cd29", label: "main-c32cd29 (2026-03-12 05:36 UTC)", hint: undefined },
      { value: "latest", label: "latest (2026-03-13 20:48 UTC)", hint: undefined }
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

test("shows tags in descending chronological order and marks the current tag", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-set-image-"));
  fs.writeFileSync(
    path.join(projectRoot, "config.yaml"),
    "images:\n  api: public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29\n"
  );
  const input = createInteractiveStream();
  const output = createInteractiveStream();

  promptState.select.mockResolvedValueOnce("api").mockResolvedValueOnce("main-4c5949c");

  await runSetImageVersion(
    { limit: 5 },
    {
      input,
      output,
      configStore: new RepoConfigStore(projectRoot),
      registry: {
        async listAvailableTags() {
          return [
            { tag: "main-4c5949c", createdAt: "2026-03-13T18:22:38.515Z" },
            { tag: "main-47a7002", createdAt: "2026-03-13T18:11:56.827Z" },
            { tag: "main-c32cd29", createdAt: "2026-03-12T05:36:25.602Z" }
          ];
        },
        buildImageReference(service: ManagedImageService, tag: string) {
          return `public.ecr.aws/x6n0f2k4/companyhelm-${service === "api" ? "api" : "web"}:${tag}`;
        }
      }
    }
  );

  expect(promptState.select).toHaveBeenNthCalledWith(2, {
    message: "Choose the api image tag",
    options: [
      { value: "main-4c5949c", label: "main-4c5949c (2026-03-13 18:22 UTC)", hint: undefined },
      { value: "main-47a7002", label: "main-47a7002 (2026-03-13 18:11 UTC)", hint: undefined },
      { value: "main-c32cd29", label: "main-c32cd29 (2026-03-12 05:36 UTC)", hint: "current" }
    ],
    initialValue: "main-c32cd29",
    input,
    output
  });
});
