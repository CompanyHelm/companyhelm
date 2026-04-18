import assert from "node:assert/strict";
import { test } from "node:test";
import { ModelProviderCredentialCatalog } from "../src/pages/model-provider-credentials/provider_catalog";

test("adds NVIDIA as a web-only OpenAI-compatible credential option", () => {
  const providers = ModelProviderCredentialCatalog.toDialogProviders([
    {
      authorizationInstructionsMarkdown: "Use an OpenAI-compatible endpoint.",
      id: "openai-compatible",
      name: "OpenAI-compatible API",
      type: "api_key",
    },
  ]);

  assert.deepEqual(providers.map((provider) => provider.id), ["openai-compatible", "nvidia"]);
  assert.equal(providers[1]?.submittedProviderId, "openai-compatible");
  assert.equal(providers[1]?.baseUrl, "https://integrate.api.nvidia.com/v1");
  assert.match(
    providers[1]?.authorizationInstructionsMarkdown ?? "",
    /https:\/\/build\.nvidia\.com\/settings\/api-keys/,
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
