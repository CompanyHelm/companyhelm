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
  assert.deepEqual(service.get("openai-compatible"), {
    id: "openai-compatible",
    name: "OpenAI-compatible API",
    type: ModelProviderAuthorizationType.ApiKey,
    authorizationInstructionsMarkdown:
      "Use an OpenAI-compatible `/v1` endpoint such as Ollama, vLLM, LM Studio, or a compatible proxy.",
  });
});

test("ModelProviderService returns oauth instructions for openai-codex", () => {
  const service = new ModelProviderService();

  assert.deepEqual(service.get("openai-codex"), {
    id: "openai-codex",
    name: "OpenAI Codex",
    type: ModelProviderAuthorizationType.Oauth,
    authorizationInstructionsMarkdown: [
      "Run this command. It copies the auth file to your clipboard; paste it into the Auth File field below.",
      "```",
      "npx @mariozechner/pi-ai login openai-codex && cat auth.json | pbcopy && rm auth.json",
      "```",
    ].join("\n"),
  });
});

test("ModelProviderService returns API key instructions for Google Gemini API", () => {
  const service = new ModelProviderService();

  assert.deepEqual(service.get("google"), {
    id: "google",
    name: "Google Gemini API",
    type: ModelProviderAuthorizationType.ApiKey,
    authorizationInstructionsMarkdown:
      "Create an API key in [Google AI Studio](https://aistudio.google.com/app/apikey) for the Gemini API.",
  });
});

test("ModelProviderService lists supported providers in modal order", () => {
  const service = new ModelProviderService();

  assert.deepEqual(
    service.list().map((provider) => provider.id),
    ["openai", "anthropic", "google", "openrouter", "openai-compatible", "openai-codex"],
  );
});

test("ModelProviderService rejects unsupported providers", () => {
  const service = new ModelProviderService();

  assert.throws(() => service.get("companyhelm"), /Unsupported model provider: companyhelm/);
  assert.throws(() => service.get("gemini"), /Unsupported model provider: gemini/);
  assert.throws(() => service.get("google-gemini-cli"), /Unsupported model provider: google-gemini-cli/);
});
