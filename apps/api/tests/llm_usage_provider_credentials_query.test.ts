import assert from "node:assert/strict";
import { test } from "vitest";
import { LlmUsageProviderCredentialsQueryResolver } from "../src/graphql/resolvers/llm_usage_provider_credentials.ts";

class LlmUsageProviderCredentialsQueryTestHarness {
  private selectCallIndex = 0;

  constructor(private readonly rowsBySelectCall: Array<Array<Record<string, unknown>>>) {}

  createContext() {
    return {
      authSession: {
        company: {
          id: "company-1",
          name: "Example Org",
        },
        token: "token",
        user: {
          id: "user-1",
        },
      },
      app_runtime_transaction_provider: {
        transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
          return callback({
            execute: async () => undefined,
            select: () => {
              const rows = this.rowsBySelectCall[this.selectCallIndex] ?? [];
              this.selectCallIndex += 1;

              return {
                from: () => ({
                  where: async () => rows,
                }),
              };
            },
          });
        },
      },
    } as never;
  }

  static createAggregate(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      cacheReadCostNanoUsd: 0,
      cacheReadCostNanoVirtualUsd: 0,
      cacheReadTokens: 0,
      cacheWriteCostNanoUsd: 0,
      cacheWriteCostNanoVirtualUsd: 0,
      cacheWriteTokens: 0,
      companyId: "company-1",
      createdAt: new Date("2026-04-20T12:00:00.000Z"),
      id: "aggregate-1",
      inputCostNanoUsd: 0,
      inputCostNanoVirtualUsd: 0,
      inputTokens: 0,
      outputCostNanoUsd: 0,
      outputCostNanoVirtualUsd: 0,
      outputTokens: 0,
      period: "total",
      periodStart: new Date(0),
      requestCount: 1,
      agentId: null,
      modelCredentialSource: "platform",
      modelProviderCredentialId: null,
      platformModelProviderCredentialId: "platform-credential-1",
      sessionId: null,
      scopeType: "model_provider_credential",
      totalCostNanoUsd: 0,
      totalCostNanoVirtualUsd: 1_000,
      totalTokens: 10,
      updatedAt: new Date("2026-04-20T12:00:00.000Z"),
      ...overrides,
    };
  }
}

test("LlmUsageProviderCredentialsQueryResolver returns user and managed credentials with totals", async () => {
  const resolver = new LlmUsageProviderCredentialsQueryResolver();
  const harness = new LlmUsageProviderCredentialsQueryTestHarness([
    [{
      baseUrl: null,
      id: "user-credential-1",
      modelProvider: "openai",
      name: "OpenAI",
      status: "active",
      type: "api_key",
    }],
    [
      LlmUsageProviderCredentialsQueryTestHarness.createAggregate({
        id: "user-total",
        modelCredentialSource: "user_provided",
        modelProviderCredentialId: "user-credential-1",
        platformModelProviderCredentialId: null,
        totalCostNanoUsd: 2_000,
        totalCostNanoVirtualUsd: 0,
      }),
      LlmUsageProviderCredentialsQueryTestHarness.createAggregate({
        id: "managed-total",
        modelCredentialSource: null,
        platformModelProviderCredentialId: null,
        scopeType: "managed_model_provider_credential",
        totalCostNanoVirtualUsd: 5_000,
      }),
      LlmUsageProviderCredentialsQueryTestHarness.createAggregate({
        id: "platform-openai-total",
        platformModelProviderCredentialId: "platform-credential-1",
        totalCostNanoVirtualUsd: 1_000,
      }),
      LlmUsageProviderCredentialsQueryTestHarness.createAggregate({
        id: "platform-codex-total",
        platformModelProviderCredentialId: "platform-credential-2",
        totalCostNanoVirtualUsd: 1_500,
      }),
    ],
    [
      { id: "platform-credential-1" },
      { id: "platform-credential-2" },
    ],
  ]);

  const result = await resolver.execute(null, null, harness.createContext());

  assert.deepEqual(result.map((row) => row.id), [
    "platform:managed",
    "user_provided:user-credential-1",
  ]);
  assert.equal(result[0]?.name, "CompanyHelm managed");
  assert.equal(result[0]?.modelCredentialSource, "platform");
  assert.equal(result[0]?.modelProvider, "companyhelm");
  assert.equal(result[0]?.total.scopeType, "managed_model_provider_credential");
  assert.equal(result[0]?.total.platformModelProviderCredentialId, null);
  assert.equal(result[0]?.total.totalCostNanoVirtualUsd, 5_000);
  assert.equal(result[1]?.name, "OpenAI");
  assert.equal(result[1]?.total.totalCostNanoUsd, 2_000);
});
