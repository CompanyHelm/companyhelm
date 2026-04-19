import assert from "node:assert/strict";
import test from "node:test";
import viteConfig from "../vite.config";

test("allows E2B preview hosts in the Vite dev server", () => {
  const serverConfig = "server" in viteConfig ? viteConfig.server : undefined;
  const allowedHosts = serverConfig?.allowedHosts;

  assert.ok(Array.isArray(allowedHosts));
  assert.ok(allowedHosts.includes(".e2b.app"));
});
