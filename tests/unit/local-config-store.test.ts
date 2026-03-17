import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import { ImageCatalog } from "../../src/core/runtime/ImageCatalog.js";
import { LocalConfigStore } from "../../src/core/runtime/LocalConfigStore.js";

const originalCwd = process.cwd();
const originalHome = process.env.COMPANYHELM_HOME;

afterEach(() => {
  process.chdir(originalCwd);
  if (originalHome === undefined) {
    delete process.env.COMPANYHELM_HOME;
  } else {
    process.env.COMPANYHELM_HOME = originalHome;
  }
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
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-config-home-"));
  process.env.COMPANYHELM_HOME = runtimeRoot;
  fs.writeFileSync(
    path.join(runtimeRoot, "config.yaml"),
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

test("default local config store uses COMPANYHELM_HOME", () => {
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-config-home-"));
  process.env.COMPANYHELM_HOME = runtimeRoot;

  const store = new LocalConfigStore();
  store.setAgentWorkspaceMode("dedicated");

  expect(store.configPath()).toBe(path.join(runtimeRoot, "config.yaml"));
  expect(fs.readFileSync(path.join(runtimeRoot, "config.yaml"), "utf8")).toContain("agent_workspace_mode: dedicated");
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
