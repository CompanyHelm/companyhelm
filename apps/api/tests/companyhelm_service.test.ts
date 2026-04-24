import assert from "node:assert/strict";
import { test } from "vitest";
import { CompanyHelmLlmProviderService } from "../src/services/ai_providers/companyhelm_service.ts";
import { ModelRegistry } from "../src/services/ai_providers/model_registry.ts";

/**
 * Verifies that the managed CompanyHelm provider can reconcile its curated catalog against the
 * runtime OpenAI API key capabilities without crashing startup.
 */
test("CompanyHelmLlmProviderService filters unavailable managed models and logs a warning", async () => {
  const service = new CompanyHelmLlmProviderService({
    companyhelm: {
      e2b: {
        api_key: "e2b-local-api-key",
      },
      llm: {
        openai_api_key: "sk-companyhelm-managed",
      },
    },
  } as never, new ModelRegistry());
  const warnings: Array<{ message: string; payload: Record<string, unknown> }> = [];

  const models = await service.refreshAvailableSeedModels({
    async fetchModels() {
      return new ModelRegistry().getModelsForProvider("openai").filter((model) => model.modelId !== "gpt-5.5");
    },
  } as never, {
    warn(payload: Record<string, unknown>, message: string) {
      warnings.push({
        message,
        payload,
      });
    },
  });

  assert.ok(models.every((model) => model.modelId !== "gpt-5.5"));
  assert.ok(service.getSeedModels().every((model) => model.modelId !== "gpt-5.5"));
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.message, "filtered unavailable CompanyHelm-managed models from the startup catalog");
  assert.deepEqual(warnings[0]?.payload.missingModelIds, ["gpt-5.5"]);
});
