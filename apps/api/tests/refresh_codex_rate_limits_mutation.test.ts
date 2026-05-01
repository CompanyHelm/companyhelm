import assert from "node:assert/strict";
import { test } from "vitest";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { RefreshCodexRateLimitsMutation } from "../src/graphql/mutations/refresh_codex_rate_limits.ts";
import type { CodexRateLimitRefreshCredential } from "../src/services/ai_providers/codex_rate_limit_service.ts";

class RefreshCodexRateLimitsMutationRefreshService {
  readonly calls: Array<{
    credential: CodexRateLimitRefreshCredential;
    force: boolean | undefined;
  }> = [];

  async refreshCredentialLimits(
    _transactionProvider: TransactionProviderInterface,
    credential: CodexRateLimitRefreshCredential,
    _refreshedAt: Date,
    options?: { force?: boolean },
  ): Promise<void> {
    this.calls.push({
      credential,
      force: options?.force,
    });
  }
}

class RefreshCodexRateLimitsMutationTestHarness {
  createContext(): GraphqlRequestContext {
    let selectCallCount = 0;
    const tx = {
      select() {
        selectCallCount += 1;
        if (selectCallCount === 1 || selectCallCount === 2) {
          return {
            from: () => ({
              where: () => [{
                baseUrl: null,
                companyId: "company-1",
                encryptedApiKey: "codex-access-token",
                id: "credential-1",
                modelProvider: "openai-codex",
              }],
            }),
          };
        }

        if (selectCallCount === 3) {
          return {
            from: () => ({
              where: () => ({
                orderBy: () => [{
                  creditsBalance: "42",
                  creditsHasCredits: true,
                  creditsUnlimited: false,
                  lastError: null,
                  limitId: "codex",
                  limitName: "Codex",
                  planType: "pro",
                  primaryResetsAt: new Date("2026-04-28T12:00:00.000Z"),
                  primaryUsedPercent: 7,
                  primaryWindowMinutes: 300,
                  rateLimitReachedType: null,
                  refreshedAt: new Date("2026-04-28T11:00:00.000Z"),
                  secondaryResetsAt: null,
                  secondaryUsedPercent: 1,
                  secondaryWindowMinutes: 10_080,
                }],
              }),
            }),
          };
        }

        throw new Error("Unexpected select call.");
      },
    };

    return {
      authSession: {
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "Test",
          id: "user-1",
          lastName: "User",
          provider: "clerk",
          providerSubject: "clerk-user-1",
        },
        company: {
          id: "company-1",
          name: "CompanyHelm",
        },
      },
      app_runtime_transaction_provider: {
        transaction: async (callback) => callback(tx as never),
      },
    } as GraphqlRequestContext;
  }
}

test("RefreshCodexRateLimits forces an upstream refresh and returns the latest snapshots", async () => {
  const refreshService = new RefreshCodexRateLimitsMutationRefreshService();
  const mutation = new RefreshCodexRateLimitsMutation(refreshService as never);

  const result = await mutation.execute(
    null,
    {
      input: {
        modelProviderCredentialId: "credential-1",
      },
    },
    new RefreshCodexRateLimitsMutationTestHarness().createContext(),
  );

  assert.equal(refreshService.calls[0]?.force, true);
  assert.deepEqual(refreshService.calls[0]?.credential, {
    apiKey: "codex-access-token",
    baseUrl: null,
    companyId: "company-1",
    credentialId: "credential-1",
    credentialSource: "user_provided",
    modelProvider: "openai-codex",
  });
  assert.equal(result.snapshots[0]?.limitId, "codex");
  assert.equal(result.snapshots[0]?.primary.windowMinutes, 300);
  assert.equal(result.snapshots[0]?.secondary.windowMinutes, 10_080);
});
