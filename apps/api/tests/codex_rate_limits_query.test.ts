import assert from "node:assert/strict";
import { test } from "vitest";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { CodexRateLimitsQueryResolver } from "../src/graphql/resolvers/codex_rate_limits.ts";
import type { CodexRateLimitRefreshCredential } from "../src/services/ai_providers/codex_rate_limit_service.ts";

class CodexRateLimitsQueryRefreshService {
  readonly credentials: CodexRateLimitRefreshCredential[] = [];

  async refreshCredentialLimits(
    _transactionProvider: TransactionProviderInterface,
    credential: CodexRateLimitRefreshCredential,
  ): Promise<void> {
    this.credentials.push(credential);
  }
}

class CodexRateLimitsQueryTestHarness {
  /**
   * Simulates the resolver's first empty snapshot read followed by the persisted snapshot that the
   * refresh service would create after calling the upstream ChatGPT usage endpoint.
   */
  static createContext(): GraphqlRequestContext {
    let selectCallCount = 0;
    const tx = {
      select() {
        selectCallCount += 1;
        if (selectCallCount === 1 || selectCallCount === 3) {
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

        if (selectCallCount === 2) {
          return {
            from: () => ({
              where: () => ({
                orderBy: () => [],
              }),
            }),
          };
        }

        if (selectCallCount === 4) {
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
                  secondaryWindowMinutes: 10080,
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

test("CodexRateLimits refreshes from upstream when no snapshot exists", async () => {
  const refreshService = new CodexRateLimitsQueryRefreshService();
  const resolver = new CodexRateLimitsQueryResolver(refreshService as never);

  const result = await resolver.execute(
    null,
    {
      modelProviderCredentialId: "credential-1",
    },
    CodexRateLimitsQueryTestHarness.createContext(),
  );

  assert.deepEqual(refreshService.credentials, [{
    apiKey: "codex-access-token",
    baseUrl: null,
    companyId: "company-1",
    credentialId: "credential-1",
    credentialSource: "user_provided",
    modelProvider: "openai-codex",
  }]);
  assert.deepEqual(result, {
    isCodexCredential: true,
    modelProviderCredentialId: "credential-1",
    snapshots: [{
      credits: {
        balance: "42",
        hasCredits: true,
        unlimited: false,
      },
      lastError: null,
      limitId: "codex",
      limitName: "Codex",
      planType: "pro",
      primary: {
        resetsAt: "2026-04-28T12:00:00.000Z",
        usedPercent: 7,
        windowMinutes: 300,
      },
      rateLimitReachedType: null,
      refreshedAt: "2026-04-28T11:00:00.000Z",
      secondary: {
        resetsAt: null,
        usedPercent: 1,
        windowMinutes: 10080,
      },
    }],
  });
});
