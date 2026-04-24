import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { ImageGenerationModelRegistry } from "../src/services/ai_providers/image_generation/model_registry.ts";
import { ImageGenerationProviderModel } from "../src/services/ai_providers/image_generation/model.ts";
import { ImageGenerationModelService } from "../src/services/ai_providers/image_generation/model_service.ts";

class RefreshingImageGenerationModelService extends ImageGenerationModelService {
  async fetchModels(): Promise<ImageGenerationProviderModel[]> {
    return [
      new ImageGenerationProviderModel({
        description: "OpenAI image model.",
        modelId: "gpt-image-2",
        name: "ChatGPT Images 2.0",
        provider: "openai",
        supportedQualities: ["low", "medium", "high", "auto"],
        supportedSizes: ["auto"],
        supportsEditing: true,
        supportsFlexibleSizes: true,
      }),
    ];
  }
}

test("ImageGenerationModelService fetchModels uses the dedicated openai-codex adapter", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount += 1;
    throw new Error("openai-codex should not call the OpenAI models API");
  }) as typeof fetch;

  try {
    const modelService = new ImageGenerationModelService(new ImageGenerationModelRegistry());

    const models = await modelService.fetchModels("openai-codex", "oauth-access-token");

    assert.equal(fetchCallCount, 0);
    assert.equal(models[0]?.provider, "openai-codex");
    assert.ok(models.some((model) => model.modelId === "gpt-image-2"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ImageGenerationModelService refreshStoredModels persists image model capability metadata", async () => {
  const currentModels: Array<{
    createdAt: Date;
    description: string;
    id: string;
    isDefault: boolean;
    modelProviderCredentialId: string;
    modelId: string;
    name: string;
    outputMimeTypes: string[];
    supportedQualities: string[];
    supportedSizes: string[];
    supportsEditing: boolean;
    supportsFlexibleSizes: boolean;
    supportsTransparentBackground: boolean;
    updatedAt: Date;
  }> = [];
  const transactionProvider = {
    async transaction(transaction: (tx: unknown) => Promise<unknown>) {
      return transaction({
        delete() {
          return {
            async where() {
              return undefined;
            },
          };
        },
        insert() {
          return {
            async values(value: Record<string, unknown> | Array<Record<string, unknown>>) {
              const values = Array.isArray(value) ? value : [value];
              values.forEach((nextValue, index) => {
                currentModels.push({
                  createdAt: nextValue.createdAt as Date,
                  description: String(nextValue.description),
                  id: `image-model-${index + 1}`,
                  isDefault: Boolean(nextValue.isDefault),
                  modelId: String(nextValue.modelId),
                  modelProviderCredentialId: String(nextValue.modelProviderCredentialId),
                  name: String(nextValue.name),
                  outputMimeTypes: nextValue.outputMimeTypes as string[],
                  supportedQualities: nextValue.supportedQualities as string[],
                  supportedSizes: nextValue.supportedSizes as string[],
                  supportsEditing: Boolean(nextValue.supportsEditing),
                  supportsFlexibleSizes: Boolean(nextValue.supportsFlexibleSizes),
                  supportsTransparentBackground: Boolean(nextValue.supportsTransparentBackground),
                  updatedAt: nextValue.updatedAt as Date,
                });
              });
            },
          };
        },
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
                  currentModels.forEach((currentModel) => {
                    if ("isDefault" in value) {
                      currentModel.isDefault = Boolean(value.isDefault);
                    }
                  });
                },
              };
            },
          };
        },
      });
    },
  };
  const modelService = new RefreshingImageGenerationModelService(new ImageGenerationModelRegistry());

  const refreshedModels = await modelService.refreshStoredModels({
    apiKey: "encrypted-api-key",
    companyId: "company-123",
    modelProvider: "openai",
    modelProviderCredentialId: "credential-1",
    transactionProvider: transactionProvider as never,
  });

  assert.equal(refreshedModels[0]?.modelId, "gpt-image-2");
  assert.equal(refreshedModels[0]?.supportsEditing, true);
  assert.equal(refreshedModels[0]?.supportsFlexibleSizes, true);
  assert.deepEqual(refreshedModels[0]?.supportedQualities, ["low", "medium", "high", "auto"]);
});
