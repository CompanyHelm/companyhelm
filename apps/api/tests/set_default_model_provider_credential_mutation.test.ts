import assert from "node:assert/strict";
import { test } from "vitest";
import { modelProviderCredentialModels, modelProviderCredentials } from "../src/db/schema.ts";
import { SetDefaultModelProviderCredentialMutation } from "../src/graphql/mutations/set_default_model_provider_credential.ts";

type CredentialRow = {
  companyId: string;
  createdAt: Date;
  id: string;
  isDefault: boolean;
  modelProvider: "anthropic" | "openai" | "openai-codex";
  name: string;
  refreshedAt: Date | null;
  refreshToken: string | null;
  type: "api_key" | "oauth_token";
  updatedAt: Date;
};

type CredentialModelRow = {
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  reasoningLevels: string[] | null;
};

/**
 * Provides the narrow transaction surface needed to verify default-credential promotion without a
 * real database connection.
 */
class SetDefaultModelProviderCredentialMutationTestHarness {
  private readonly credentialRows: CredentialRow[];
  private readonly modelRows: CredentialModelRow[];

  constructor() {
    this.credentialRows = [{
      companyId: "company-123",
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      id: "credential-2",
      isDefault: false,
      modelProvider: "openai",
      name: "OpenAI Prod",
      refreshedAt: null,
      refreshToken: null,
      type: "api_key",
      updatedAt: new Date("2026-04-05T00:05:00.000Z"),
    }, {
      companyId: "company-123",
      createdAt: new Date("2026-04-04T00:00:00.000Z"),
      id: "credential-1",
      isDefault: true,
      modelProvider: "anthropic",
      name: "Anthropic Prod",
      refreshedAt: null,
      refreshToken: null,
      type: "api_key",
      updatedAt: new Date("2026-04-04T00:05:00.000Z"),
    }];
    this.modelRows = [{
      isDefault: true,
      modelId: "gpt-5.4",
      modelProviderCredentialId: "credential-2",
      reasoningLevels: ["medium", "high"],
    }];
  }

  buildTransactionProvider() {
    const credentialRows = this.credentialRows;
    const modelRows = this.modelRows;

    return {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from(table: unknown) {
                return {
                  async where() {
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
          update(table: unknown) {
            return {
              set(value: Record<string, unknown>) {
                return {
                  async where() {
                    if (table === modelProviderCredentials) {
                      if (value.isDefault === false) {
                        credentialRows.forEach((row) => {
                          row.isDefault = false;
                        });
                      }
                      if (value.isDefault === true) {
                        credentialRows[0]!.isDefault = true;
                      }
                    }
                  },
                };
              },
            };
          },
        });
      },
    };
  }

  getCredentialRows(): CredentialRow[] {
    return this.credentialRows;
  }
}

test("SetDefaultModelProviderCredentialMutation promotes one credential and preserves its stored default model", async () => {
  const harness = new SetDefaultModelProviderCredentialMutationTestHarness();
  const mutation = new SetDefaultModelProviderCredentialMutation();

  const result = await mutation.execute({}, {
    input: {
      id: "credential-2",
    },
  }, {
    app_runtime_transaction_provider: harness.buildTransactionProvider(),
    authSession: {
      company: {
        id: "company-123",
        name: "Example Org",
      },
    },
  } as never);

  assert.equal(harness.getCredentialRows()[0]?.isDefault, true);
  assert.equal(harness.getCredentialRows()[1]?.isDefault, false);
  assert.deepEqual(result, {
    companyId: "company-123",
    createdAt: "2026-04-05T00:00:00.000Z",
    defaultModelId: "gpt-5.4",
    defaultReasoningLevel: "high",
    id: "credential-2",
    isDefault: true,
    modelProvider: "openai",
    name: "OpenAI Prod",
    refreshedAt: null,
    refreshToken: null,
    type: "api_key",
    updatedAt: "2026-04-05T00:05:00.000Z",
  });
});
