import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { RuntimeStateStore } from "../../src/core/runtime/RuntimeStateStore.js";

test("initializes state with admin credentials and runner secret", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-state-"));
  const store = new RuntimeStateStore(root);

  const state = store.initialize();

  expect(state.auth.username).toBe("admin");
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
