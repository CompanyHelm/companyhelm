import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { LocalRepoSourceResolver } from "../../src/core/local/LocalRepoSourceResolver.js";

test("resolves sibling defaults when local repo flags are present without values", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-source-"));
  const companyhelmRoot = path.join(workspaceRoot, "companyhelm");
  fs.mkdirSync(companyhelmRoot, { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, "companyhelm-api"), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, "companyhelm-web"), { recursive: true });

  const resolved = new LocalRepoSourceResolver(companyhelmRoot).resolve({
    apiRepoPath: true,
    webRepoPath: true
  });

  expect(resolved).toEqual({
    api: {
      source: "local",
      repoPath: path.join(workspaceRoot, "companyhelm-api")
    },
    frontend: {
      source: "local",
      repoPath: path.join(workspaceRoot, "companyhelm-web")
    }
  });
});

test("resolves explicit local repo paths", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-source-"));
  const companyhelmRoot = path.join(workspaceRoot, "companyhelm");
  const apiRepo = path.join(workspaceRoot, "services", "api");
  const webRepo = path.join(workspaceRoot, "services", "web");
  fs.mkdirSync(companyhelmRoot, { recursive: true });
  fs.mkdirSync(apiRepo, { recursive: true });
  fs.mkdirSync(webRepo, { recursive: true });

  const resolved = new LocalRepoSourceResolver(companyhelmRoot).resolve({
    apiRepoPath: "../services/api",
    webRepoPath: "../services/web"
  });

  expect(resolved).toEqual({
    api: {
      source: "local",
      repoPath: apiRepo
    },
    frontend: {
      source: "local",
      repoPath: webRepo
    }
  });
});

test("keeps docker mode when local repo flags are omitted", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-source-"));
  const companyhelmRoot = path.join(workspaceRoot, "companyhelm");
  fs.mkdirSync(companyhelmRoot, { recursive: true });

  const resolved = new LocalRepoSourceResolver(companyhelmRoot).resolve({});

  expect(resolved).toEqual({
    api: {
      source: "docker"
    },
    frontend: {
      source: "docker"
    }
  });
});

test("fails when a selected local repo path does not exist", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-local-source-"));
  const companyhelmRoot = path.join(workspaceRoot, "companyhelm");
  fs.mkdirSync(companyhelmRoot, { recursive: true });

  expect(() => new LocalRepoSourceResolver(companyhelmRoot).resolve({
    apiRepoPath: true
  })).toThrow(/companyhelm-api/);
});
