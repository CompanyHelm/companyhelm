import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

test("web server disables caching for runtime-config.js", () => {
  const repoRoot = resolve(import.meta.dirname, "..", "..", "..");
  const caddyfile = readFileSync(join(repoRoot, "docker", "web", "Caddyfile"), "utf8");

  assert.match(caddyfile, /@runtimeConfig path \/runtime-config\.js/);
  assert.match(caddyfile, /header @runtimeConfig Cache-Control "no-store, no-cache, must-revalidate"/);
});
