import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import { GithubAppConfigStore } from "../../src/core/config/GithubAppConfigStore.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test("saves and loads machine github app config", () => {
  const configRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-github-app-config-"));
  const store = new GithubAppConfigStore(configRoot);

  const savedPath = store.save({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----",
  });

  expect(savedPath).toBe(path.join(configRoot, "github-app.yaml"));
  expect(store.load()).toEqual({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });
});

test("loadOrThrow gives a setup hint when config is missing", () => {
  const configRoot = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-github-app-config-missing-"));
  const store = new GithubAppConfigStore(configRoot);

  expect(() => store.loadOrThrow()).toThrow(/setup-github-app/);
});
