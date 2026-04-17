import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { modelProviderCredentials } from "../src/db/schema.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { CompanyHelmLlmProviderService } from "../src/services/ai_providers/companyhelm_service.ts";
import { ModelRegistry } from "../src/services/ai_providers/model_registry.js";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

test("RefreshModelProviderCredentialModelsMutation resolves managed credentials from CompanyHelm config", async () => {
  const calls: Array<{
    apiKey: string;
    companyId: string;
    modelProvider: string;
    modelProviderCredentialId: string;
  }> = [];
  const modelService = {
    async refreshStoredModels(input: {
      apiKey: string;
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
  const mutation = new RefreshModelProviderCredentialModelsMutation(
    modelService as never,
    new CompanyHelmLlmProviderService({
      companyhelm: {
        llm: {
          openai_api_key: "sk-companyhelm-managed",
        },
      },
    } as Config, new ModelRegistry()),
  );
  const context = {
    authSession: {
      token: "jwt-token",
      user: {
        email: "user@example.com",
        firstName: "User",
        id: "user-123",
        lastName: "Example",
        provider: "clerk" as const,
        providerSubject: "user_clerk_123",
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
                          encryptedApiKey: CompanyHelmLlmProviderService.ENCRYPTED_API_KEY_SENTINEL,
                          id: "credential-123",
                          isManaged: true,
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
    companyId: call.companyId,
    modelProvider: call.modelProvider,
    modelProviderCredentialId: call.modelProviderCredentialId,
  }, {
    apiKey: "sk-companyhelm-managed",
    companyId: "company-123",
    modelProvider: "openai",
    modelProviderCredentialId: "credential-123",
  });
  assert.deepEqual(models, [{
    description: "Latest frontier agentic coding model.",
    modelId: "gpt-5.4",
    name: "GPT-5.4",
    provider: "openai",
    reasoningLevels: ["high"],
    reasoningSupported: true,
  }]);
});
