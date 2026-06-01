import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { modelProviderCredentials } from "../src/db/schema.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

test("RefreshModelProviderCredentialModelsMutation refreshes models with the stored credential key", async () => {
  const calls: Array<{
    apiKey: string;
    baseUrl?: string | null;
    companyId: string;
    modelProvider: string;
    modelProviderCredentialId: string;
  }> = [];
  const modelService = {
    async refreshStoredModels(input: {
      apiKey: string;
      baseUrl?: string | null;
      companyId: string;
      modelProvider: string;
      modelProviderCredentialId: string;
    }): Promise<ModelProviderModel[]> {
      calls.push(input);
      return [{
        description: "Latest frontier agentic coding model.",
        modelId: "gpt-5.4",
        name: "GPT-5.4",
        provider: "openai",
        reasoningLevels: ["high"],
        reasoningSupported: true,
      }];
    },
  };
  const mutation = new RefreshModelProviderCredentialModelsMutation(modelService as never);
  const context = {
    authSession: {
      token: "jwt-token",
      user: {
        email: "user@example.com",
        firstName: "User",
        id: "user-123",
        lastName: "Example",
        provider: "local" as const,
        providerSubject: "user_local_123",
      },
      company: {
        id: "company-123",
        name: "Example Org",
      },
    },
    app_runtime_transaction_provider: {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from(table: unknown) {
                assert.equal(table, modelProviderCredentials);
                return {
                  where() {
                    return {
                      async limit() {
                        return [{
                          companyId: "company-123",
                          baseUrl: null,
                          encryptedApiKey: "sk-user-provided",
                          id: "credential-123",
                          modelProvider: "openai",
                        }];
                      },
                    };
                  },
                };
              },
            };
          },
        });
      },
    },
  };

  const models = await mutation.execute(null, {
    input: {
      modelProviderCredentialId: "credential-123",
    },
  }, context as never);

  const call = calls[0];
  assert.equal(calls.length, 1);
  assert.ok(call);
  assert.deepEqual({
    apiKey: call.apiKey,
    baseUrl: call.baseUrl,
    companyId: call.companyId,
    modelProvider: call.modelProvider,
    modelProviderCredentialId: call.modelProviderCredentialId,
  }, {
    apiKey: "sk-user-provided",
    baseUrl: null,
    companyId: "company-123",
    modelProvider: "openai",
    modelProviderCredentialId: "credential-123",
  });
  assert.deepEqual(models, [{
    description: "Latest frontier agentic coding model.",
    modelId: "gpt-5.4",
    modelOptions: [],
    name: "GPT-5.4",
    provider: "openai",
    reasoningLevels: ["high"],
    reasoningSupported: true,
  }]);
});
