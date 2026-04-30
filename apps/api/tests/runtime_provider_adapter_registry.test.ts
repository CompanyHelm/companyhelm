import assert from "node:assert/strict";
import { test } from "vitest";
import { RuntimeProviderAdapterRegistry } from "../src/services/agent/session/runtime/provider_adapter_registry.ts";

test("RuntimeProviderAdapterRegistry maps non-placeholder CompanyHelm credentials to OpenAI runtime auth", () => {
  const registry = new RuntimeProviderAdapterRegistry();

  assert.deepEqual(registry.resolve("companyhelm", {
    apiKey: "sk-companyhelm-managed",
    modelId: "gpt-5.4",
  }), {
    apiKey: "sk-companyhelm-managed",
    providerId: "openai",
  });
});

test("RuntimeProviderAdapterRegistry keeps concrete routed providers as runtime providers", () => {
  const registry = new RuntimeProviderAdapterRegistry();

  assert.deepEqual(registry.resolve("openrouter", {
    apiKey: "sk-openrouter",
    modelId: "anthropic/claude-sonnet-4.5",
  }), {
    apiKey: "sk-openrouter",
    providerId: "openrouter",
  });
});


test("RuntimeProviderAdapterRegistry rejects placeholder CompanyHelm credentials before provider calls", () => {
  const registry = new RuntimeProviderAdapterRegistry();

  assert.throws(() => registry.resolve("companyhelm", {
    apiKey: "companyhelm-managed-openai-api-key",
    modelId: "gpt-5.4",
  }), /CompanyHelm-managed local model access is not configured/);
});
