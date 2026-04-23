import assert from "node:assert/strict";
import test from "node:test";
import viteConfig from "../vite.config";

test("allows E2B preview hosts in the Vite dev server", () => {
  const resolvedConfig = typeof viteConfig === "function" ? viteConfig({
    command: "serve",
    isPreview: false,
    mode: "test",
  }) : viteConfig;
  const serverConfig = "server" in resolvedConfig ? resolvedConfig.server : undefined;
  const allowedHosts = serverConfig?.allowedHosts;

  assert.ok(Array.isArray(allowedHosts));
  assert.ok(allowedHosts.includes(".e2b.app"));
  assert.equal(serverConfig?.host, "0.0.0.0");
});

test("adds a GraphQL proxy when VITE_GRAPHQL_PROXY_TARGET is provided", () => {
  process.env.VITE_GRAPHQL_PROXY_TARGET = "https://api.dev.companyhelm.com";

  const resolvedConfig = typeof viteConfig === "function" ? viteConfig({
    command: "serve",
    isPreview: false,
    mode: "test",
  }) : viteConfig;
  const serverConfig = "server" in resolvedConfig ? resolvedConfig.server : undefined;
  const proxyConfig = serverConfig?.proxy;

  assert.ok(proxyConfig && typeof proxyConfig === "object");
  assert.deepEqual(proxyConfig["/graphql"], {
    changeOrigin: true,
    target: "https://api.dev.companyhelm.com",
    ws: true,
  });

  delete process.env.VITE_GRAPHQL_PROXY_TARGET;
});

test("aliases Clerk to the local dev auth shim when the bypass flag is enabled", () => {
  process.env.VITE_LOCAL_DEV_AUTH_BYPASS = "true";

  const resolvedConfig = typeof viteConfig === "function" ? viteConfig({
    command: "serve",
    isPreview: false,
    mode: "test",
  }) : viteConfig;
  const resolveConfig = "resolve" in resolvedConfig ? resolvedConfig.resolve : undefined;
  const aliasConfig = resolveConfig?.alias;
  const clerkAlias = aliasConfig && !Array.isArray(aliasConfig)
    ? aliasConfig["@clerk/react"]
    : undefined;

  assert.equal(typeof clerkAlias, "string");
  assert.match(clerkAlias || "", /local_dev_clerk\.tsx$/);

  delete process.env.VITE_LOCAL_DEV_AUTH_BYPASS;
});
