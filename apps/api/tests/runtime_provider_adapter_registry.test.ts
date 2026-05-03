import assert from "node:assert/strict";
import { test } from "vitest";
import { RuntimeProviderAdapterRegistry } from "../src/services/agent/session/runtime/provider_adapter_registry.ts";

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

test("RuntimeProviderAdapterRegistry rejects removed CompanyHelm-managed credentials", () => {
  const registry = new RuntimeProviderAdapterRegistry();

  assert.throws(() => registry.resolve("companyhelm", {
    apiKey: "companyhelm-managed-openai-api-key",
    modelId: "gpt-5.4",
  }), /Unsupported runtime model provider: companyhelm/);
});
