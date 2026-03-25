import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import { ModelRegistry } from "../src/services/model_registry.ts";
import { ModelService } from "../src/services/model_service.ts";

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

  assert.deepEqual(models.map((model) => model.name), [
    "gpt-5.4",
    "gpt-5.3-codex",
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

  assert.deepEqual(models.map((model) => model.name), [
    "claude-opus-4-6",
    "claude-haiku-4-5",
  ]);
  assert.equal(models[0]?.reasoningLevels, null);
  assert.equal(models[1]?.reasoningLevels, null);
});
