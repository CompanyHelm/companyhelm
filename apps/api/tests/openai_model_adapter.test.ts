import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { ModelRegistry } from "../src/services/ai_providers/model_registry.ts";
import { OpenAiCodexModelAdapter } from "../src/services/providers/models-adapters/openai_codex_model_adapter.ts";

test("OpenAiCodexModelAdapter returns PI mono models without calling the models API", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount += 1;
    throw new Error("openai-codex should not call the models API");
  }) as typeof fetch;

  try {
    const modelRegistry = new ModelRegistry();
    const adapter = new OpenAiCodexModelAdapter(modelRegistry);

    const models = await adapter.fetchModels("oauth-access-token");

    assert.equal(fetchCallCount, 0);
    assert.deepEqual(models.map((model) => model.provider), Array(models.length).fill("openai-codex"));
    assert.deepEqual(models.map((model) => model.modelId), [
      "gpt-5.1",
      "gpt-5.1-codex-max",
      "gpt-5.1-codex-mini",
      "gpt-5.2",
      "gpt-5.2-codex",
      "gpt-5.3-codex",
      "gpt-5.3-codex-spark",
      "gpt-5.4",
      "gpt-5.4-mini",
    ]);
    assert.equal(models.find((model) => model.modelId === "gpt-5.4")?.description, "Latest frontier agentic coding model.");
    assert.deepEqual(
      models.find((model) => model.modelId === "gpt-5.4")?.reasoningLevels,
      ["low", "medium", "high", "xhigh"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
