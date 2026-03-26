import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import {
  ModelProviderAuthorizationType,
  ModelProviderService,
} from "../src/services/ai_providers/model_provider_service.ts";

test("ModelProviderService returns provider metadata for API key providers", () => {
  const service = new ModelProviderService();

  assert.deepEqual(service.get("openai"), {
    id: "openai",
    name: "OpenAI API Key",
    type: ModelProviderAuthorizationType.ApiKey,
    authorizationInstructionsMarkdown:
      "Create an API key in the [OpenAI Platform](https://platform.openai.com/api-keys).",
  });
  assert.deepEqual(service.get("anthropic"), {
    id: "anthropic",
    name: "Anthropic",
    type: ModelProviderAuthorizationType.ApiKey,
    authorizationInstructionsMarkdown:
      "Create an API key in the [Anthropic Platform](https://platform.claude.com/settings/keys).",
  });
});

test("ModelProviderService returns oauth instructions for openai-codex", () => {
  const service = new ModelProviderService();

  assert.deepEqual(service.get("openai-codex"), {
    id: "openai-codex",
    name: "OpenAI Codex OAuth",
    type: ModelProviderAuthorizationType.Oauth,
    authorizationInstructionsMarkdown: [
      "run this command",
      "```",
      "npx @mariozechner/pi-ai login openai-codex && cat auth.json | pbcopy",
      "```",
      "Paste the full auth JSON file below.",
    ].join("\n"),
  });
});

test("ModelProviderService lists supported providers in modal order", () => {
  const service = new ModelProviderService();

  assert.deepEqual(
    service.list().map((provider) => provider.id),
    ["openai", "anthropic", "openai-codex"],
  );
});

test("ModelProviderService rejects unsupported providers", () => {
  const service = new ModelProviderService();

  assert.throws(() => service.get("gemini"), /Unsupported model provider: gemini/);
});
