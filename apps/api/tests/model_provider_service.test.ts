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
    name: "OpenAI",
    type: ModelProviderAuthorizationType.ApiKey,
    authorizationInstructionsMarkdown:
      "Create an API key in the [OpenAI API quickstart](https://platform.openai.com/docs/quickstart/step-2-set-up-your-api-key).",
  });
  assert.deepEqual(service.get("anthropic"), {
    id: "anthropic",
    name: "Anthropic",
    type: ModelProviderAuthorizationType.ApiKey,
    authorizationInstructionsMarkdown:
      "Create an API key in the [Anthropic API getting started guide](https://docs.anthropic.com/en/api/getting-started).",
  });
  assert.deepEqual(service.get("openrouter"), {
    id: "openrouter",
    name: "OpenRouter",
    type: ModelProviderAuthorizationType.ApiKey,
    authorizationInstructionsMarkdown:
      "Create an API key in the [OpenRouter keys settings](https://openrouter.ai/settings/keys).",
  });
});

test("ModelProviderService returns oauth instructions for openai-codex", () => {
  const service = new ModelProviderService();

  assert.deepEqual(service.get("openai-codex"), {
    id: "openai-codex",
    name: "OpenAI Codex",
    type: ModelProviderAuthorizationType.Oauth,
    authorizationInstructionsMarkdown: [
      "run this command",
      "```",
      "npx @mariozechner/pi-ai login openai-codex && cat auth.json | pbcopy && rm auth.json and paste below",
      "```",
    ].join("\n"),
  });
});

test("ModelProviderService returns oauth instructions for google-gemini-cli", () => {
  const service = new ModelProviderService();

  assert.deepEqual(service.get("google-gemini-cli"), {
    id: "google-gemini-cli",
    name: "Google Gemini CLI",
    type: ModelProviderAuthorizationType.Oauth,
    authorizationInstructionsMarkdown: [
      "run this command",
      "```",
      "npx @mariozechner/pi-ai login google-gemini-cli && cat auth.json | pbcopy && rm auth.json and paste below",
      "```",
    ].join("\n"),
  });
});

test("ModelProviderService lists supported providers in modal order", () => {
  const service = new ModelProviderService();

  assert.deepEqual(
    service.list().map((provider) => provider.id),
    ["openai", "anthropic", "openrouter", "openai-codex", "google-gemini-cli"],
  );
});

test("ModelProviderService rejects unsupported providers", () => {
  const service = new ModelProviderService();

  assert.throws(() => service.get("gemini"), /Unsupported model provider: gemini/);
});
