import assert from "node:assert/strict";
import { test } from "node:test";
import { ModelProviderCredentialCatalog } from "../src/pages/model-provider-credentials/provider_catalog";

test("adds NVIDIA as the web-only OpenAI-compatible credential option", () => {
  const providers = ModelProviderCredentialCatalog.toDialogProviders([
    {
      authorizationInstructionsMarkdown: "Use an OpenAI-compatible endpoint.",
      id: "openai-compatible",
      name: "OpenAI-compatible API",
      type: "api_key",
    },
  ]);

  assert.deepEqual(providers.map((provider) => provider.id), ["nvidia", "openai-compatible"]);
  assert.equal(providers[0]?.authorizationLabel, "API key");
  assert.equal(providers[0]?.name, "NVIDIA");
  assert.equal(providers[0]?.submittedProviderId, "openai-compatible");
  assert.equal(providers[0]?.baseUrl, "https://integrate.api.nvidia.com/v1");
  assert.equal(providers[1]?.authorizationLabel, "API key");
  assert.equal(providers[1]?.name, "OpenAI Compatible");
  assert.equal(providers[1]?.submittedProviderId, "openai-compatible");
  assert.equal(providers[1]?.baseUrl, null);
  assert.match(
    providers[0]?.authorizationInstructionsMarkdown ?? "",
    /https:\/\/build\.nvidia\.com\/settings\/api-keys/,
  );
});

test("orders and labels dialog providers for the credential picker", () => {
  const providers = ModelProviderCredentialCatalog.toDialogProviders([
    {
      authorizationInstructionsMarkdown: null,
      id: "openai",
      name: "OpenAI (API key)",
      type: "api_key",
    },
    {
      authorizationInstructionsMarkdown: null,
      id: "openrouter",
      name: "OpenRouter (API key)",
      type: "api_key",
    },
    {
      authorizationInstructionsMarkdown: null,
      id: "openai-codex",
      name: "OpenAI Codex",
      type: "oauth",
    },
    {
      authorizationInstructionsMarkdown: null,
      id: "google",
      name: "Google Gemini API",
      type: "api_key",
    },
    {
      authorizationInstructionsMarkdown: null,
      id: "anthropic",
      name: "Anthropic (API key)",
      type: "api_key",
    },
    {
      authorizationInstructionsMarkdown: null,
      id: "openai-compatible",
      name: "OpenAI-compatible API",
      type: "api_key",
    },
  ]);

  assert.deepEqual(
    providers.map((provider) => [provider.id, provider.name, provider.authorizationLabel]),
    [
      ["openai-codex", "Codex", "Subscription"],
      ["anthropic", "Anthropic", "API key"],
      ["openai", "OpenAI", "API key"],
      ["google", "Gemini", "API key"],
      ["openrouter", "OpenRouter", "API key"],
      ["nvidia", "NVIDIA", "API key"],
      ["openai-compatible", "OpenAI Compatible", "API key"],
    ],
  );
});

test("identifies persisted NVIDIA credentials from the OpenAI-compatible base URL", () => {
  assert.equal(
    ModelProviderCredentialCatalog.isNvidiaCredential({
      baseUrl: "https://integrate.api.nvidia.com/v1",
      modelProvider: "openai-compatible",
    }),
    true,
  );
  assert.equal(
    ModelProviderCredentialCatalog.isNvidiaCredential({
      baseUrl: "http://localhost:11434/v1",
      modelProvider: "openai-compatible",
    }),
    false,
  );
});
