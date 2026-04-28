import assert from "node:assert/strict";
import { test } from "vitest";
import {
  companyModelProviderDefaults,
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../src/db/schema.ts";
import { SetDefaultModelProviderCredentialMutation } from "../src/graphql/mutations/set_default_model_provider_credential.ts";

type CredentialRow = {
  companyId: string;
  createdAt: Date;
  errorMessage: string | null;
  id: string;
  isDefault: boolean;
  modelProvider: "anthropic" | "openai" | "openai-codex";
  name: string;
  refreshedAt: Date | null;
  refreshToken: string | null;
  status: "active" | "error";
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
  private readonly defaultProviderSelection: {
    modelCredentialSource: "platform" | "user_provided";
    modelProviderCredentialId: string | null;
  };

  constructor() {
    this.credentialRows = [{
      companyId: "company-123",
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      errorMessage: null,
      id: "credential-2",
      isDefault: false,
      modelProvider: "openai",
      name: "OpenAI Prod",
      refreshedAt: null,
      refreshToken: null,
      status: "active",
      type: "api_key",
      updatedAt: new Date("2026-04-05T00:05:00.000Z"),
    }, {
      companyId: "company-123",
      createdAt: new Date("2026-04-04T00:00:00.000Z"),
      errorMessage: null,
      id: "credential-1",
      isDefault: true,
      modelProvider: "anthropic",
      name: "Anthropic Prod",
      refreshedAt: null,
      refreshToken: null,
      status: "active",
      type: "api_key",
      updatedAt: new Date("2026-04-04T00:05:00.000Z"),
    }];
    this.modelRows = [{
      isDefault: true,
      modelId: "gpt-5.4",
      modelProviderCredentialId: "credential-2",
      reasoningLevels: ["medium", "high"],
    }];
    this.defaultProviderSelection = {
      modelCredentialSource: "user_provided",
      modelProviderCredentialId: "credential-1",
    };
  }

  buildTransactionProvider() {
    const credentialRows = this.credentialRows;
    const modelRows = this.modelRows;
    const defaultProviderSelection = this.defaultProviderSelection;

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
                    if (table === companyModelProviderDefaults) {
                      Object.assign(defaultProviderSelection, value);
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

  getDefaultProviderSelection() {
    return this.defaultProviderSelection;
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

  assert.equal(harness.getDefaultProviderSelection().modelCredentialSource, "user_provided");
  assert.equal(harness.getDefaultProviderSelection().modelProviderCredentialId, "credential-2");
  assert.deepEqual(result, {
    companyId: "company-123",
    createdAt: "2026-04-05T00:00:00.000Z",
    defaultModelId: "gpt-5.4",
    defaultReasoningLevel: "high",
    errorMessage: null,
    id: "credential-2",
    isDefault: true,
    modelProvider: "openai",
    name: "OpenAI Prod",
    refreshedAt: null,
    refreshToken: null,
    status: "active",
    type: "api_key",
    updatedAt: "2026-04-05T00:05:00.000Z",
  });
});
