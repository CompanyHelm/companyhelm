import assert from "node:assert/strict";
import { test } from "vitest";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { RefreshPlatformCodexRateLimitsMutation } from "../src/graphql/mutations/refresh_platform_codex_rate_limits.ts";
import type { CodexRateLimitRefreshCredential } from "../src/services/ai_providers/codex_rate_limit_service.ts";

class RefreshPlatformCodexRateLimitsMutationRefreshService {
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

class RefreshPlatformCodexRateLimitsMutationTestHarness {
  readonly executeCalls: unknown[] = [];

  createContext(isPlatformAdmin = true): GraphqlRequestContext {
    let selectCallCount = 0;
    const tx = {
      execute: async (query: unknown) => {
        this.executeCalls.push(query);
      },
      select: () => {
        selectCallCount += 1;
        if (selectCallCount === 1 || selectCallCount === 2) {
          return {
            from: () => ({
              where: () => [{
                baseUrl: null,
                encryptedApiKey: "platform-codex-access-token",
                id: "platform-credential-1",
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
                  creditsBalance: "123",
                  creditsHasCredits: true,
                  creditsUnlimited: false,
                  lastError: null,
                  limitId: "codex",
                  limitName: "Codex",
                  planType: "pro",
                  primaryResetsAt: new Date("2026-04-28T10:00:00.000Z"),
                  primaryUsedPercent: 42,
                  primaryWindowMinutes: 300,
                  rateLimitReachedType: null,
                  refreshedAt: new Date("2026-04-28T09:00:00.000Z"),
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
      isPlatformAdmin,
      authSession: {
        token: "jwt-token",
        user: {
          email: "admin@example.com",
          firstName: "Admin",
          id: "admin-user",
          lastName: "User",
          provider: "clerk",
          providerSubject: "clerk-admin-user",
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

test("RefreshPlatformCodexRateLimits forces a platform upstream refresh and returns snapshots", async () => {
  const harness = new RefreshPlatformCodexRateLimitsMutationTestHarness();
  const refreshService = new RefreshPlatformCodexRateLimitsMutationRefreshService();
  const mutation = new RefreshPlatformCodexRateLimitsMutation(refreshService as never);

  const result = await mutation.execute(
    null,
    {
      input: {
        platformModelProviderCredentialId: "platform-credential-1",
      },
    },
    harness.createContext(),
  );

  assert.equal(harness.executeCalls.length, 2);
  assert.equal(refreshService.calls[0]?.force, true);
  assert.deepEqual(refreshService.calls[0]?.credential, {
    apiKey: "platform-codex-access-token",
    baseUrl: null,
    companyId: "company-1",
    credentialId: "platform-credential-1",
    credentialSource: "platform",
    modelProvider: "openai-codex",
  });
  assert.equal(result.snapshots[0]?.limitId, "codex");
  assert.equal(result.snapshots[0]?.primary.windowMinutes, 300);
  assert.equal(result.snapshots[0]?.secondary.windowMinutes, 10_080);
});

test("RefreshPlatformCodexRateLimits rejects non-platform-admin users", async () => {
  const mutation = new RefreshPlatformCodexRateLimitsMutation(
    new RefreshPlatformCodexRateLimitsMutationRefreshService() as never,
  );

  await assert.rejects(
    mutation.execute(
      null,
      {
        input: {
          platformModelProviderCredentialId: "platform-credential-1",
        },
      },
      new RefreshPlatformCodexRateLimitsMutationTestHarness().createContext(false),
    ),
    /Platform admin access required\./,
  );
});
