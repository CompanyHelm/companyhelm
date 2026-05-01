import assert from "node:assert/strict";
import { test } from "vitest";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { PlatformCodexRateLimitsQueryResolver } from "../src/graphql/resolvers/platform_codex_rate_limits.ts";

class PlatformCodexRateLimitsQueryTestHarness {
  readonly executeCalls: unknown[] = [];

  /**
   * Provides a minimal Drizzle-shaped transaction so the resolver test verifies the admin access
   * binding, credential lookup, and platform snapshot mapping without depending on a real database.
   */
  createContext(isPlatformAdmin: boolean, credentialModelProvider: string): GraphqlRequestContext {
    let selectCallCount = 0;
    const tx = {
      execute: async (query: unknown) => {
        this.executeCalls.push(query);
      },
      select: () => {
        selectCallCount += 1;
        if (selectCallCount === 1) {
          return {
            from: () => ({
              where: () => [{
                id: "platform-credential-1",
                modelProvider: credentialModelProvider,
              }],
            }),
          };
        }

        if (selectCallCount === 2) {
          return {
            from: () => ({
              where: () => ({
                orderBy: () => [{
                  creditsBalance: "123",
                  creditsHasCredits: true,
                  creditsUnlimited: false,
                  lastError: null,
                  limitId: "gpt-5",
                  limitName: "GPT-5",
                  planType: "pro",
                  primaryResetsAt: new Date("2026-04-28T10:00:00.000Z"),
                  primaryUsedPercent: 42,
                  primaryWindowMinutes: 300,
                  rateLimitReachedType: null,
                  refreshedAt: new Date("2026-04-28T09:00:00.000Z"),
                  secondaryResetsAt: null,
                  secondaryUsedPercent: null,
                  secondaryWindowMinutes: null,
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

test("PlatformCodexRateLimits maps platform Codex snapshots for platform admins", async () => {
  const harness = new PlatformCodexRateLimitsQueryTestHarness();
  const resolver = new PlatformCodexRateLimitsQueryResolver();

  const result = await resolver.execute(
    null,
    {
      platformModelProviderCredentialId: "platform-credential-1",
    },
    harness.createContext(true, "openai-codex"),
  );

  assert.equal(harness.executeCalls.length, 1);
  assert.deepEqual(result, {
    isCodexCredential: true,
    modelProviderCredentialId: "platform-credential-1",
    snapshots: [{
      credits: {
        balance: "123",
        hasCredits: true,
        unlimited: false,
      },
      lastError: null,
      limitId: "gpt-5",
      limitName: "GPT-5",
      planType: "pro",
      primary: {
        resetsAt: "2026-04-28T10:00:00.000Z",
        usedPercent: 42,
        windowMinutes: 300,
      },
      rateLimitReachedType: null,
      refreshedAt: "2026-04-28T09:00:00.000Z",
      secondary: {
        resetsAt: null,
        usedPercent: null,
        windowMinutes: null,
      },
    }],
  });
});

test("PlatformCodexRateLimits hides snapshots for non-Codex platform credentials", async () => {
  const resolver = new PlatformCodexRateLimitsQueryResolver();

  const result = await resolver.execute(
    null,
    {
      platformModelProviderCredentialId: "platform-credential-1",
    },
    new PlatformCodexRateLimitsQueryTestHarness().createContext(true, "openai"),
  );

  assert.deepEqual(result, {
    isCodexCredential: false,
    modelProviderCredentialId: "platform-credential-1",
    snapshots: [],
  });
});

test("PlatformCodexRateLimits rejects non-platform-admin users", async () => {
  const resolver = new PlatformCodexRateLimitsQueryResolver();

  await assert.rejects(
    resolver.execute(
      null,
      {
        platformModelProviderCredentialId: "platform-credential-1",
      },
      new PlatformCodexRateLimitsQueryTestHarness().createContext(false, "openai-codex"),
    ),
    /Platform admin access required\./,
  );
});
