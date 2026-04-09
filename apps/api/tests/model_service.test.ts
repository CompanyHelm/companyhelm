import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";
import { ModelRegistry } from "../src/services/ai_providers/model_registry.ts";
import { ModelProviderModel, ModelService } from "../src/services/ai_providers/model_service.js";

class RefreshingModelService extends ModelService {
  async fetchModels(): Promise<ModelProviderModel[]> {
    return [
      new ModelProviderModel({
        provider: "openai",
        modelId: "gpt-5.4",
        name: "GPT-5.4",
        description: "Latest frontier agentic coding model.",
        reasoningLevels: ["low", "medium", "high", "xhigh"],
      }),
      new ModelProviderModel({
        provider: "openai",
        modelId: "gpt-5.4-mini",
        name: "GPT-5.4 Mini",
        description: "Smaller frontier agentic coding model.",
        reasoningLevels: ["low", "medium", "high", "xhigh"],
      }),
    ];
  }
}

class ModelServiceTestHarness {
  static createTransactionProviderMock() {
    const currentModels: Array<{
      id: string;
      modelProviderCredentialId: string;
      modelId: string;
      name: string;
      description: string;
      reasoningSupported: boolean;
      reasoningLevels: string[] | null;
    }> = [
      {
        id: "existing-model-row",
        modelProviderCredentialId: "credential-1",
        modelId: "gpt-5.4",
        name: "GPT-5.4 Old",
        description: "Old description",
        reasoningSupported: true,
        reasoningLevels: ["low"],
      },
      {
        id: "removed-model-row",
        modelProviderCredentialId: "credential-1",
        modelId: "gpt-4.1",
        name: "GPT-4.1",
        description: "To be removed",
        reasoningSupported: false,
        reasoningLevels: null,
      },
    ];
    const updatedIds: string[] = [];
    const insertedIds: string[] = [];
    const deletedIds: string[] = [];
    const transactionProvider: TransactionProviderInterface = {
      async transaction(transaction) {
        return transaction({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [...currentModels];
                  },
                };
              },
            };
          },
          update() {
            return {
              set(value: Record<string, unknown>) {
                return {
                  async where() {
                    const index = currentModels.findIndex((model) => model.id === "existing-model-row");
                    if (
                      "name" in value
                      || "description" in value
                      || "reasoningSupported" in value
                      || "reasoningLevels" in value
                    ) {
                      currentModels[index] = {
                        ...currentModels[index],
                        name: "name" in value ? String(value.name) : currentModels[index].name,
                        description: "description" in value
                          ? String(value.description)
                          : currentModels[index].description,
                        reasoningSupported: "reasoningSupported" in value
                          ? Boolean(value.reasoningSupported)
                          : currentModels[index].reasoningSupported,
                        reasoningLevels: "reasoningLevels" in value
                          ? (value.reasoningLevels as string[] | null) ?? null
                          : currentModels[index].reasoningLevels,
                      };
                      updatedIds.push("existing-model-row");
                    }
                  },
                };
              },
            };
          },
          insert() {
            return {
              async values(value: Record<string, unknown> | Array<Record<string, unknown>>) {
                const values = Array.isArray(value) ? value : [value];
                for (const nextValue of values) {
                  const insertedId = `inserted-${insertedIds.length + 1}`;
                  insertedIds.push(insertedId);
                  currentModels.push({
                    id: insertedId,
                    modelProviderCredentialId: String(nextValue.modelProviderCredentialId),
                    modelId: String(nextValue.modelId),
                    name: String(nextValue.name),
                    description: String(nextValue.description),
                    reasoningSupported: Boolean(nextValue.reasoningSupported),
                    reasoningLevels: (nextValue.reasoningLevels as string[] | null) ?? null,
                  });
                }
              },
            };
          },
          delete() {
            return {
              async where() {
                const index = currentModels.findIndex((model) => model.id === "removed-model-row");
                if (index >= 0) {
                  deletedIds.push(currentModels[index].id);
                  currentModels.splice(index, 1);
                }
              },
            };
          },
        } as never);
      },
    };

    return {
      currentModels,
      deletedIds,
      insertedIds,
      transactionProvider,
      updatedIds,
    };
  }
}

test("ModelService refreshStoredModels preserves ids and applies only the diff", async () => {
  const transactionProvider = ModelServiceTestHarness.createTransactionProviderMock();
  const modelService = new RefreshingModelService(new ModelRegistry());

  const refreshedModels = await modelService.refreshStoredModels({
    apiKey: "encrypted-api-key",
    companyId: "company-123",
    modelProvider: "openai",
    modelProviderCredentialId: "credential-1",
    transactionProvider: transactionProvider.transactionProvider,
  });

  assert.deepEqual(refreshedModels, [
    {
      id: "existing-model-row",
      modelProviderCredentialId: "credential-1",
      modelId: "gpt-5.4",
      name: "GPT-5.4",
      description: "Latest frontier agentic coding model.",
      reasoningSupported: true,
      reasoningLevels: ["low", "medium", "high", "xhigh"],
    },
    {
      id: "inserted-1",
      modelProviderCredentialId: "credential-1",
      modelId: "gpt-5.4-mini",
      name: "GPT-5.4 Mini",
      description: "Smaller frontier agentic coding model.",
      reasoningSupported: true,
      reasoningLevels: ["low", "medium", "high", "xhigh"],
    },
  ]);
  assert.deepEqual(transactionProvider.updatedIds, ["existing-model-row"]);
  assert.deepEqual(transactionProvider.insertedIds, ["inserted-1"]);
  assert.deepEqual(transactionProvider.deletedIds, ["removed-model-row"]);
});

test("ModelService fetchModels uses the dedicated openai-codex adapter", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount += 1;
    throw new Error("openai-codex should not call the OpenAI models API");
  }) as typeof fetch;

  try {
    const modelService = new ModelService(new ModelRegistry());

    const models = await modelService.fetchModels("openai-codex", "oauth-access-token");

    assert.equal(fetchCallCount, 0);
    assert.equal(models[0]?.provider, "openai-codex");
    assert.ok(models.some((model) => model.modelId === "gpt-5.4"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ModelService fetchModels uses the dedicated openrouter adapter", async () => {
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
            architecture: {
              input_modalities: ["text", "image"],
            },
            context_length: 2_000_000,
            supported_parameters: ["reasoning"],
            top_provider: {
              max_completion_tokens: 4_096,
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
    const modelService = new ModelService(new ModelRegistry());

    const models = await modelService.fetchModels("openrouter", "sk-or-v1");

    assert.deepEqual(calls, [
      "https://openrouter.ai/api/v1/key",
      "https://openrouter.ai/api/v1/models",
    ]);
    assert.equal(models.length, 1);
    assert.deepEqual(models[0], new ModelProviderModel({
      provider: "openrouter",
      modelId: "openrouter/auto",
      name: "Auto Router",
      description: "Automatically routes requests.",
      reasoningSupported: models[0]?.reasoningSupported ?? false,
    }));
    assert.equal(typeof models[0]?.reasoningSupported, "boolean");
    assert.equal(models[0]?.reasoningLevels, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
