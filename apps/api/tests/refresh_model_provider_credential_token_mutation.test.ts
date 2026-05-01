import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { modelProviderCredentialModels, modelProviderCredentials } from "../src/db/schema.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { RefreshModelProviderCredentialTokenMutation } from "../src/graphql/mutations/refresh_model_provider_credential_token.ts";

class RefreshModelProviderCredentialTokenMutationTestHarness {
  static createContext(
    credentialRows: Array<Record<string, unknown>>,
    modelRows: Array<Record<string, unknown>>,
  ): GraphqlRequestContext {
    const transactionProvider = {
      async transaction<T>(callback: (tx: unknown) => Promise<T>) {
        const transaction = {
          select() {
            return {
              from(table: unknown) {
                return {
                  where() {
                    return {
                      async limit() {
                        if (table === modelProviderCredentials) {
                          return credentialRows;
                        }

                        if (table === modelProviderCredentialModels) {
                          return modelRows;
                        }

                        return [];
                      },
                    };
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
                    const nextCredential = credentialRows[0];
                    if (!nextCredential) {
                      return;
                    }

                    credentialRows[0] = {
                      ...nextCredential,
                      ...value,
                    };
                  },
                };
              },
            };
          },
        };

        return callback(transaction);
      },
    };

    return {
      authSession: {
        company: {
          id: "company-123",
          name: "Example Org",
        },
      } as never,
      app_runtime_transaction_provider: transactionProvider,
      redisCompanyScopedService: null,
      resolveSubscriptionContext: null,
    };
  }
}

test("RefreshModelProviderCredentialTokenMutation refreshes an oauth credential and returns the updated record", async () => {
  const credentialRows = [{
    id: "credential-1",
    companyId: "company-123",
    name: "OpenAI / Codex",
    modelProvider: "openai-codex",
    type: "oauth_token",
    refreshToken: "old-refresh-token",
    refreshedAt: new Date("2026-04-01T10:00:00.000Z"),
    createdAt: new Date("2026-03-20T10:00:00.000Z"),
    isDefault: true,
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
    encryptedApiKey: "old-access-token",
    accessTokenExpiresAt: new Date("2026-04-20T10:00:00.000Z"),
  }];
  const modelRows = [{
    isDefault: true,
    modelId: "gpt-5.4",
    modelProviderCredentialId: "credential-1",
    reasoningLevels: ["low", "medium", "high", "xhigh"],
  }];
  const refreshService = {
    calls: [] as Array<Record<string, unknown>>,
    async refreshCredential(credential: Record<string, unknown>) {
      this.calls.push(credential);

      return {
        access: "new-access-token",
        refresh: "new-refresh-token",
        expires: Date.parse("2026-04-20T12:00:00.000Z"),
      };
    },
  };
  const mutation = new RefreshModelProviderCredentialTokenMutation(undefined, refreshService as never);

  const result = await mutation.execute(
    {},
    {
      input: {
        modelProviderCredentialId: "credential-1",
      },
    },
    RefreshModelProviderCredentialTokenMutationTestHarness.createContext(credentialRows, modelRows),
  );

  assert.deepEqual(refreshService.calls, [{
    accessTokenExpiresAtMilliseconds: Date.parse("2026-04-20T10:00:00.000Z"),
    encryptedApiKey: "old-access-token",
    id: "credential-1",
    modelProvider: "openai-codex",
    refreshToken: "old-refresh-token",
  }]);
  assert.equal(result.id, "credential-1");
  assert.equal(result.defaultModelId, "gpt-5.4");
  assert.equal(result.defaultReasoningLevel, "high");
  assert.equal(result.refreshToken, "new-refresh-token");
  assert.match(String(result.refreshedAt), /^\d{4}-\d{2}-\d{2}T/);
  assert.match(result.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("RefreshModelProviderCredentialTokenMutation rejects non-oauth credentials", async () => {
  const credentialRows = [{
    id: "credential-1",
    companyId: "company-123",
    name: "OpenAI",
    modelProvider: "openai",
    type: "api_key",
    refreshToken: null,
    refreshedAt: null,
    createdAt: new Date("2026-03-20T10:00:00.000Z"),
    isDefault: false,
    updatedAt: new Date("2026-03-20T10:00:00.000Z"),
    encryptedApiKey: "api-key",
    accessTokenExpiresAt: null,
  }];
  const mutation = new RefreshModelProviderCredentialTokenMutation();

  await assert.rejects(
    () => mutation.execute(
      {},
      {
        input: {
          modelProviderCredentialId: "credential-1",
        },
      },
      RefreshModelProviderCredentialTokenMutationTestHarness.createContext(credentialRows, []),
    ),
    /Only OAuth credentials can be refreshed\./,
  );
});
