import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import { ImageCatalog } from "../../src/core/runtime/ImageCatalog.js";
import { LocalConfigStore } from "../../src/core/runtime/LocalConfigStore.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
  delete process.env.COMPANYHELM_API_IMAGE;
  delete process.env.COMPANYHELM_WEB_IMAGE;
});

test("writes and reads local config image pins", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-config-"));
  const store = new LocalConfigStore(projectRoot);

  store.setAgentWorkspaceMode("current-working-directory");
  store.setImage("api", "public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29");
  store.setImage("frontend", "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844");

  expect(fs.readFileSync(path.join(projectRoot, "config.yaml"), "utf8")).toBe(
    [
      "agent_workspace_mode: current-working-directory",
      "images:",
      "  api: public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29",
      "  frontend: public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844",
      ""
    ].join("\n")
  );
  expect(store.load()).toEqual({
    agentWorkspaceMode: "current-working-directory",
    images: {
      api: "public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29",
      frontend: "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844"
    }
  });
});

test("image catalog prefers local config image pins", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-config-"));
  process.chdir(projectRoot);
  fs.writeFileSync(
    path.join(projectRoot, "config.yaml"),
    "images:\n  api: public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29\n",
    "utf8"
  );
  process.env.COMPANYHELM_API_IMAGE = "registry.example.com/ignored-api:old";

  expect(new ImageCatalog().resolve()).toEqual({
    api: "public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29",
    frontend: "public.ecr.aws/x6n0f2k4/companyhelm-web:latest",
    postgres: "postgres:16-alpine"
  });
});

test("loads agent workspace mode without image pins", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-config-"));
  fs.writeFileSync(
    path.join(projectRoot, "config.yaml"),
    "agent_workspace_mode: dedicated\nimages:\n",
    "utf8"
  );

  expect(new LocalConfigStore(projectRoot).load()).toEqual({
    agentWorkspaceMode: "dedicated",
    images: {}
  });
});
