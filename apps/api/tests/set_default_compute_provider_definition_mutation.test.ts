import assert from "node:assert/strict";
import { test } from "vitest";
import { SetDefaultComputeProviderDefinitionMutation } from "../src/graphql/mutations/set_default_compute_provider_definition.ts";

test("SetDefaultComputeProviderDefinitionMutation promotes one definition for the authenticated company", async () => {
  const mutation = new SetDefaultComputeProviderDefinitionMutation({
    async setDefaultDefinition(transactionProvider: unknown, companyId: string, definitionId: string) {
      assert.ok(transactionProvider);
      assert.equal(companyId, "company-123");
      assert.equal(definitionId, "definition-2");

      return {
        companyId: "company-123",
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        description: "Default E2B workspace provider",
        e2b: {
          hasApiKey: true,
        },
        id: "definition-2",
        isDefault: true,
        name: "Primary E2B",
        provider: "e2b" as const,
        updatedAt: new Date("2026-04-05T00:05:00.000Z"),
      };
    },
  } as never);

  const result = await mutation.execute({}, {
    input: {
      id: "definition-2",
    },
  }, {
    app_runtime_transaction_provider: {} as never,
    authSession: {
      company: {
        id: "company-123",
        name: "Example Org",
      },
    },
  } as never);

  assert.deepEqual(result, {
    companyId: "company-123",
    createdAt: "2026-04-05T00:00:00.000Z",
    description: "Default E2B workspace provider",
    e2b: {
      hasApiKey: true,
    },
    id: "definition-2",
    isDefault: true,
    name: "Primary E2B",
    provider: "e2b",
    updatedAt: "2026-04-05T00:05:00.000Z",
  });
});
