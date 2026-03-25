import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import { ModelRegistry } from "../src/services/ai_providers/model_registry.js";
import { ModelService } from "../src/services/ai_providers/model_service.js";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test("ModelService returns only OpenAI models that exist in both the provider response and the registry", async () => {
  global.fetch = (async () => ({
    ok: true,
    async json() {
      return {
        data: [
          { id: "gpt-5.4" },
          { id: "gpt-5.3-codex" },
          { id: "gpt-4.1" },
        ],
      };
    },
  })) as typeof fetch;

  const modelService = new ModelService(new ModelRegistry());
  const models = await modelService.fetchModels("openai", "openai-api-key");

  assert.deepEqual(models.map((model) => ({ modelId: model.modelId, name: model.name })), [
    { modelId: "gpt-5.4", name: "GPT-5.4" },
    { modelId: "gpt-5.3-codex", name: "GPT-5.3 Codex" },
  ]);
  assert.deepEqual(models[0]?.reasoningLevels, ["low", "medium", "high", "xhigh"]);
  assert.deepEqual(models[1]?.reasoningLevels, ["low", "medium", "high", "xhigh"]);
});

test("ModelService returns only Anthropic models that exist in both the provider response and the registry", async () => {
  global.fetch = (async () => ({
    ok: true,
    async json() {
      return {
        data: [
          { id: "claude-opus-4-6" },
          { id: "claude-haiku-4-5" },
          { id: "claude-3-7-sonnet" },
        ],
      };
    },
  })) as typeof fetch;

  const modelService = new ModelService(new ModelRegistry());
  const models = await modelService.fetchModels("anthropic", "anthropic-api-key");

  assert.deepEqual(models.map((model) => ({ modelId: model.modelId, name: model.name })), [
    { modelId: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { modelId: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
  ]);
  assert.equal(models[0]?.reasoningLevels, null);
  assert.equal(models[1]?.reasoningLevels, null);
});
