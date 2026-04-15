import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

test("web server aligns cache policy between runtime config, app shell, and hashed assets", () => {
  const repoRoot = resolve(import.meta.dirname, "..", "..", "..");
  const caddyfile = readFileSync(join(repoRoot, "docker", "web", "Caddyfile"), "utf8");

  assert.match(caddyfile, /@runtimeConfig path \/runtime-config\.js/);
  assert.match(caddyfile, /header Cache-Control "no-store, no-cache, must-revalidate"/);
  assert.match(caddyfile, /@hashedAssets path \/assets\/\*/);
  assert.match(caddyfile, /header Cache-Control "public, max-age=31536000, immutable"/);
  assert.match(caddyfile, /@staticFiles path_regexp staticFiles/);

  const runtimeConfigHandleIndex = caddyfile.indexOf("handle @runtimeConfig");
  const hashedAssetsHandleIndex = caddyfile.indexOf("handle @hashedAssets");
  const staticFilesHandleIndex = caddyfile.indexOf("handle @staticFiles");
  const appShellHandleIndex = caddyfile.lastIndexOf("handle {");

  assert.notEqual(runtimeConfigHandleIndex, -1);
  assert.notEqual(hashedAssetsHandleIndex, -1);
  assert.notEqual(staticFilesHandleIndex, -1);
  assert.notEqual(appShellHandleIndex, -1);
  assert.ok(runtimeConfigHandleIndex < hashedAssetsHandleIndex);
  assert.ok(hashedAssetsHandleIndex < staticFilesHandleIndex);
  assert.ok(staticFilesHandleIndex < appShellHandleIndex);
});
