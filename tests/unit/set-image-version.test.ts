import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";

import { expect, test } from "vitest";

import { runSetImageVersion } from "../../src/commands/set-image-version.js";
import { LocalConfigStore } from "../../src/core/runtime/LocalConfigStore.js";
import type { ManagedImageService } from "../../src/core/runtime/ManagedImages.js";

function createInteractiveStream(): PassThrough {
  const stream = new PassThrough();
  Object.defineProperty(stream, "isTTY", { value: true });
  return stream;
}

test("interactively selects an image tag and writes config.yaml", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-set-image-"));
  const input = createInteractiveStream();
  const output = createInteractiveStream();
  let rendered = "";
  output.on("data", (chunk) => {
    rendered += chunk.toString();
  });

  const runPromise = runSetImageVersion(
    { service: "api", limit: 5 },
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

  input.end("2\n");
  await runPromise;

  expect(fs.readFileSync(path.join(projectRoot, "config.yaml"), "utf8")).toContain(
    "api: public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29"
  );
  expect(rendered).toContain("Current configured image for api: default (latest)");
  expect(rendered).toContain("Choose the api image tag");
});
