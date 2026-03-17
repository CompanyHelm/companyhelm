import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import { ImageCatalog } from "../../src/core/runtime/ImageCatalog.js";
import { ImageConfigStore } from "../../src/core/runtime/ImageConfigStore.js";
import { LocalConfigStore } from "../../src/core/runtime/LocalConfigStore.js";

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

test("writes and reads packaged image pins from image_config.ts", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-project-config-"));
  const store = new ImageConfigStore(projectRoot);

  store.setImage("api", "public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29");
  store.setImage("frontend", "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844");

  expect(fs.readFileSync(path.join(projectRoot, "src", "config", "image_config.ts"), "utf8")).toBe(
    [
      "export const PACKAGED_IMAGE_CONFIG = {",
      '  api: "public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29",',
      '  frontend: "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844"',
      "} as const;",
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

test("image catalog uses packaged image pins without relying on cwd", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-config-project-"));
  const imageConfigStore = new ImageConfigStore(projectRoot);
  fs.mkdirSync(path.dirname(imageConfigStore.configPath()), { recursive: true });
  fs.writeFileSync(
    imageConfigStore.configPath(),
    [
      "export const PACKAGED_IMAGE_CONFIG = {",
      '  api: "public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29",',
      '  frontend: "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844"',
      "} as const;",
      ""
    ].join("\n"),
    "utf8"
  );

  expect(new ImageCatalog(imageConfigStore).resolve()).toEqual({
    api: "public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29",
    frontend: "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844",
    postgres: "postgres:16-alpine"
  });
});

test("image catalog lets explicit env vars override packaged image pins", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-config-project-"));
  const imageConfigStore = new ImageConfigStore(projectRoot);
  imageConfigStore.save({
    images: {
      api: "public.ecr.aws/x6n0f2k4/companyhelm-api:main-c32cd29",
      frontend: "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844"
    }
  });
  process.env.COMPANYHELM_API_IMAGE = "registry.example.com/override-api:new";

  expect(new ImageCatalog(imageConfigStore).resolve()).toEqual({
    api: "registry.example.com/override-api:new",
    frontend: "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844",
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
