import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import { ImageCatalog } from "../../src/core/runtime/ImageCatalog.js";
import { LocalConfigStore } from "../../src/core/runtime/LocalConfigStore.js";
import { RepoConfigStore } from "../../src/core/runtime/RepoConfigStore.js";

const originalCwd = process.cwd();
const originalHome = process.env.COMPANYHELM_HOME;
const originalConfigHome = process.env.COMPANYHELM_CONFIG_HOME;

afterEach(() => {
  process.chdir(originalCwd);
  if (originalHome === undefined) {
    delete process.env.COMPANYHELM_HOME;
  } else {
    process.env.COMPANYHELM_HOME = originalHome;
  }
  if (originalConfigHome === undefined) {
    delete process.env.COMPANYHELM_CONFIG_HOME;
  } else {
    process.env.COMPANYHELM_CONFIG_HOME = originalConfigHome;
  }
  delete process.env.COMPANYHELM_API_IMAGE;
  delete process.env.COMPANYHELM_WEB_IMAGE;
});

test("writes and reads cli config workspace mode", () => {
  const cliRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-cli-config-"));
  const store = new LocalConfigStore(cliRoot);

  store.setAgentWorkspaceMode("current-working-directory");

  expect(fs.readFileSync(path.join(cliRoot, "config.yaml"), "utf8")).toBe(
    [
      "agent_workspace_mode: current-working-directory",
      ""
    ].join("\n")
  );
  expect(store.load()).toEqual({
    agentWorkspaceMode: "current-working-directory"
  });
});

test("writes and reads repo image pins from config.yaml", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-project-config-"));
  const store = new RepoConfigStore(projectRoot);

  store.setImage("api", "public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29");
  store.setImage("frontend", "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844");

  expect(fs.readFileSync(path.join(projectRoot, "config.yaml"), "utf8")).toBe(
    [
      "images:",
      "  api: public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29",
      "  frontend: public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844",
      ""
    ].join("\n")
  );
  expect(store.load()).toEqual({
    images: {
      api: "public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29",
      frontend: "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844"
    }
  });
});

test("image catalog prefers repo config image pins", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-config-project-"));
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

test("default local config store uses the cli config root", () => {
  const configRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-config-home-"));
  process.env.COMPANYHELM_CONFIG_HOME = configRoot;

  const store = new LocalConfigStore();
  store.setAgentWorkspaceMode("dedicated");

  expect(fs.realpathSync(store.configPath())).toBe(fs.realpathSync(path.join(configRoot, "config.yaml")));
  expect(fs.readFileSync(path.join(configRoot, "config.yaml"), "utf8")).toContain("agent_workspace_mode: dedicated");
});

test("loads agent workspace mode without repo image pins", () => {
  const cliRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-cli-config-"));
  fs.writeFileSync(
    path.join(cliRoot, "config.yaml"),
    "agent_workspace_mode: dedicated\n",
    "utf8"
  );

  expect(new LocalConfigStore(cliRoot).load()).toEqual({
    agentWorkspaceMode: "dedicated"
  });
});
