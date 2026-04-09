import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import {
  OpenRouterCatalogService,
} from "../src/services/ai_providers/openrouter_catalog_service.js";

test("OpenRouterCatalogService validates the key and maps remote models", async () => {
  const service = new OpenRouterCatalogService();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);

    if (url.endsWith("/key")) {
      return new Response(JSON.stringify({ data: { label: "Primary key" } }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    if (url.endsWith("/models")) {
      return new Response(JSON.stringify({
        data: [
          {
            id: "openrouter/auto",
            name: "Auto Router",
            description: "Automatically routes requests.",
            context_length: 2_000_000,
            architecture: {
              input_modalities: ["text", "image"],
            },
            pricing: {
              prompt: "0.000001",
              completion: "0.000002",
              input_cache_read: "0.0000005",
              input_cache_write: "0.0000015",
            },
            supported_parameters: ["reasoning", "tools"],
            top_provider: {
              context_length: 2_000_000,
              max_completion_tokens: 4_096,
            },
          },
          {
            id: "moonshotai/kimi-k2.5",
            name: "Moonshot AI: Kimi K2.5",
            description: "Long-context coding model.",
            context_length: 128_000,
            architecture: {
              input_modalities: ["text"],
            },
            pricing: {
              prompt: "0.0000007",
              completion: "0.0000028",
            },
            supported_parameters: ["tools"],
            top_provider: {
              max_completion_tokens: 16_384,
            },
          },
        ],
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const models = await service.fetchCatalog("sk-or-v1-test");

    assert.deepEqual(calls, [
      "https://openrouter.ai/api/v1/key",
      "https://openrouter.ai/api/v1/models",
    ]);
    assert.deepEqual(models, [
      {
        contextWindow: 2_000_000,
        cost: {
          cacheRead: 0.0000005,
          cacheWrite: 0.0000015,
          input: 0.000001,
          output: 0.000002,
        },
        description: "Automatically routes requests.",
        input: ["text", "image"],
        maxTokens: 4_096,
        modelId: "openrouter/auto",
        name: "Auto Router",
        reasoningLevels: ["low", "medium", "high", "xhigh"],
      },
      {
        contextWindow: 128_000,
        cost: {
          cacheRead: 0,
          cacheWrite: 0,
          input: 0.0000007,
          output: 0.0000028,
        },
        description: "Long-context coding model.",
        input: ["text"],
        maxTokens: 16_384,
        modelId: "moonshotai/kimi-k2.5",
        name: "Moonshot AI: Kimi K2.5",
        reasoningLevels: null,
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenRouterCatalogService rejects invalid API keys before loading the public catalog", async () => {
  const service = new OpenRouterCatalogService();
  const originalFetch = globalThis.fetch;
  let modelFetchAttempted = false;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/key")) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    if (url.endsWith("/models")) {
      modelFetchAttempted = true;
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    await assert.rejects(
      service.fetchCatalog("invalid-key"),
      /Failed to validate openrouter API key: 401 Unauthorized/,
    );
    assert.equal(modelFetchAttempted, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
