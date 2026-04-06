import assert from "node:assert/strict";
import { test } from "vitest";
import { modelProviderCredentialModels } from "../src/db/schema.ts";
import { SetDefaultModelProviderCredentialModelMutation } from "../src/graphql/mutations/set_default_model_provider_credential_model.ts";

type CredentialModelRow = {
  description: string;
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  name: string;
  reasoningLevels: string[] | null;
};

/**
 * Provides the narrow transaction surface needed to verify per-credential default model promotion.
 */
class SetDefaultModelProviderCredentialModelMutationTestHarness {
  private readonly modelRows: CredentialModelRow[];

  constructor() {
    this.modelRows = [{
      description: "Latest frontier agentic coding model.",
      id: "model-row-2",
      isDefault: false,
      modelId: "gpt-5.4",
      modelProviderCredentialId: "credential-1",
      name: "GPT-5.4",
      reasoningLevels: ["low", "medium", "high", "xhigh"],
    }, {
      description: "Smaller frontier agentic coding model.",
      id: "model-row-1",
      isDefault: true,
      modelId: "gpt-5.4-mini",
      modelProviderCredentialId: "credential-1",
      name: "GPT-5.4 Mini",
      reasoningLevels: ["low", "medium", "high", "xhigh"],
    }];
  }

  buildTransactionProvider() {
    const modelRows = this.modelRows;

    return {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from(table: unknown) {
                return {
                  async where() {
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
                    if (table !== modelProviderCredentialModels) {
                      return;
                    }

                    if (value.isDefault === false) {
                      modelRows.forEach((row) => {
                        row.isDefault = false;
                      });
                    }
                    if (value.isDefault === true) {
                      modelRows[0]!.isDefault = true;
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

  getModelRows(): CredentialModelRow[] {
    return this.modelRows;
  }
}

test("SetDefaultModelProviderCredentialModelMutation promotes one stored model within the credential", async () => {
  const harness = new SetDefaultModelProviderCredentialModelMutationTestHarness();
  const mutation = new SetDefaultModelProviderCredentialModelMutation();

  const result = await mutation.execute({}, {
    input: {
      id: "model-row-2",
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

  assert.equal(harness.getModelRows()[0]?.isDefault, true);
  assert.equal(harness.getModelRows()[1]?.isDefault, false);
  assert.deepEqual(result, {
    description: "Latest frontier agentic coding model.",
    id: "model-row-2",
    isDefault: true,
    modelId: "gpt-5.4",
    modelProviderCredentialId: "credential-1",
    name: "GPT-5.4",
    reasoningLevels: ["low", "medium", "high", "xhigh"],
  });
});
