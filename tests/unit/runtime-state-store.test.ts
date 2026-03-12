import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { RuntimeStateStore } from "../../src/core/runtime/RuntimeStateStore.js";

test("initializes state with admin credentials and runner secret", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-state-"));
  const store = new RuntimeStateStore(root);

  const state = store.initialize();

  expect(state.auth.username).toBe("admin@local");
  expect(state.auth.password.length).toBeGreaterThan(10);
  expect(state.runner.secret.length).toBeGreaterThan(10);
});

test("persists initialized state to disk", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-state-"));
  const store = new RuntimeStateStore(root);

  const state = store.initialize();
  const loaded = store.load();

  expect(loaded).toEqual(state);
});

test("upgrades legacy admin username to admin@local", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-state-"));
  const store = new RuntimeStateStore(root);
  fs.writeFileSync(path.join(root, "state.json"), JSON.stringify({
    version: 1,
    company: {
      id: "company-id",
      name: "Local CompanyHelm"
    },
    auth: {
      username: "admin",
      password: "secret",
      jwtPrivateKeyPem: "private",
      jwtPublicKeyPem: "public"
    },
    runner: {
      name: "local-runner",
      secret: "runner-secret"
    },
    ports: {
      apiHttp: 4000,
      ui: 4173,
      runnerGrpc: 50051,
      agentCliGrpc: 50052
    }
  }, null, 2));

  const loaded = store.load();

  expect(loaded?.auth.username).toBe("admin@local");
});
