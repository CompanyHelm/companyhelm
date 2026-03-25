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
      reasoningLevels: string[] | null;
    }> = [
      {
        id: "existing-model-row",
        modelProviderCredentialId: "credential-1",
        modelId: "gpt-5.4",
        name: "GPT-5.4 Old",
        description: "Old description",
        reasoningLevels: ["low"],
      },
      {
        id: "removed-model-row",
        modelProviderCredentialId: "credential-1",
        modelId: "gpt-4.1",
        name: "GPT-4.1",
        description: "To be removed",
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
                    currentModels[index] = {
                      ...currentModels[index],
                      name: String(value.name),
                      description: String(value.description),
                      reasoningLevels: (value.reasoningLevels as string[] | null) ?? null,
                    };
                    updatedIds.push("existing-model-row");
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
      reasoningLevels: ["low", "medium", "high", "xhigh"],
    },
    {
      id: "inserted-1",
      modelProviderCredentialId: "credential-1",
      modelId: "gpt-5.4-mini",
      name: "GPT-5.4 Mini",
      description: "Smaller frontier agentic coding model.",
      reasoningLevels: ["low", "medium", "high", "xhigh"],
    },
  ]);
  assert.deepEqual(transactionProvider.updatedIds, ["existing-model-row"]);
  assert.deepEqual(transactionProvider.insertedIds, ["inserted-1"]);
  assert.deepEqual(transactionProvider.deletedIds, ["removed-model-row"]);
});
