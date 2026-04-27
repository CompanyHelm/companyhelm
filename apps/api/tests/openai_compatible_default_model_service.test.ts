import assert from "node:assert/strict";
import { test } from "vitest";
import { OpenAiCompatibleDefaultModelService } from "../src/services/ai_providers/openai_compatible_default_model_service.ts";

test("OpenAI-compatible default model service prefers NVIDIA Nemotron when the endpoint and model are present", () => {
  const service = new OpenAiCompatibleDefaultModelService();

  const defaultModelId = service.resolveDefaultModelId({
    baseUrl: "https://integrate.api.nvidia.com/v1",
    modelIds: [
      "meta/llama-3.1-70b-instruct",
      "nvidia/nemotron-3-super-120b-a12b",
    ],
    modelProvider: "openai-compatible",
  });

  assert.equal(defaultModelId, "nvidia/nemotron-3-super-120b-a12b");
});

test("OpenAI-compatible default model service does not force NVIDIA defaults when the model is absent", () => {
  const service = new OpenAiCompatibleDefaultModelService();

  const defaultModelId = service.resolveDefaultModelId({
    baseUrl: "https://integrate.api.nvidia.com/v1",
    modelIds: ["meta/llama-3.1-70b-instruct"],
    modelProvider: "openai-compatible",
  });

  assert.equal(defaultModelId, null);
});

test("OpenAI-compatible default model service ignores non OpenAI-compatible providers", () => {
  const service = new OpenAiCompatibleDefaultModelService();

  const defaultModelId = service.resolveDefaultModelId({
    baseUrl: "https://integrate.api.nvidia.com/v1",
    modelIds: ["nvidia/nemotron-3-super-120b-a12b"],
    modelProvider: "openai",
  });

  assert.equal(defaultModelId, null);
});
