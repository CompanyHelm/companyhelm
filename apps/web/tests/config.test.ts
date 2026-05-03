import assert from "node:assert/strict";
import { test } from "node:test";
import { Config } from "../src/config";

test("falls back to local auth and the local HTTP GraphQL endpoint by default", () => {
  const originalWindow = globalThis.window;

  try {
    // Keep the test in the same non-browser shape local Node-based tooling uses.
    delete (globalThis as typeof globalThis & { window?: unknown }).window;

    const document = Config.getDocument();

    assert.equal(document.authProvider, "local");
    assert.equal(document.graphqlUrl, "http://localhost:4000/graphql");
    assert.equal(document.privacyPolicyUrl, "");
    assert.equal(document.termsOfServiceUrl, "");
  } finally {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  }
});

test("prefers injected runtime configuration over local defaults", () => {
  const originalWindow = globalThis.window;

  try {
    globalThis.window = {
      __COMPANYHELM_CONFIG__: {
        authProvider: "local",
        graphqlUrl: "http://127.0.0.1:4100/graphql",
        privacyPolicyUrl: "https://companyhelm.example/privacy",
        termsOfServiceUrl: "https://companyhelm.example/terms",
      },
    } as Window;

    const document = Config.getDocument();

    assert.equal(document.authProvider, "local");
    assert.equal(document.graphqlUrl, "http://127.0.0.1:4100/graphql");
    assert.equal(document.privacyPolicyUrl, "https://companyhelm.example/privacy");
    assert.equal(document.termsOfServiceUrl, "https://companyhelm.example/terms");
  } finally {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  }
});

test("accepts dev auth as a runtime auth provider", () => {
  const originalWindow = globalThis.window;

  try {
    globalThis.window = {
      __COMPANYHELM_CONFIG__: {
        authProvider: "dev",
      },
    } as Window;

    const document = Config.getDocument();

    assert.equal(document.authProvider, "dev");
  } finally {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  }
});
