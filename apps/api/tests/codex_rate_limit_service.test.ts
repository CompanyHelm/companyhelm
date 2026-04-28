import { Buffer } from "node:buffer";
import { afterEach, expect, test, vi } from "vitest";
import {
  CodexRateLimitService,
  type CodexRateLimitRefreshCredential,
} from "../src/services/ai_providers/codex_rate_limit_service.ts";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";

type FakeUpsertCall = {
  record: Record<string, unknown>;
  set: Record<string, unknown>;
  table: unknown;
};

type FakeTransactionProvider = TransactionProviderInterface & {
  deleteCount: number;
  upserts: FakeUpsertCall[];
};

class CodexRateLimitServiceTestFactory {
  createCredential(overrides: Partial<CodexRateLimitRefreshCredential> = {}): CodexRateLimitRefreshCredential {
    return {
      apiKey: this.createJwt("account-123"),
      baseUrl: null,
      companyId: "11111111-1111-4111-8111-111111111111",
      credentialId: "22222222-2222-4222-8222-222222222222",
      credentialSource: "user_provided",
      modelProvider: "openai-codex",
      ...overrides,
    };
  }

  createTransactionProvider(): FakeTransactionProvider {
    const transactionProvider = {
      deleteCount: 0,
      upserts: [] as FakeUpsertCall[],
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        const tx = {
          delete: () => ({
            where: async () => {
              transactionProvider.deleteCount += 1;
            },
          }),
          insert: (table: unknown) => ({
            values: (record: Record<string, unknown>) => ({
              onConflictDoUpdate: async (config: { set: Record<string, unknown> }) => {
                transactionProvider.upserts.push({
                  record,
                  set: config.set,
                  table,
                });
              },
            }),
          }),
        };
        return callback(tx);
      },
    };
    return transactionProvider;
  }

  mockCodexUsageResponse(payload: unknown): ReturnType<typeof vi.spyOn> {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    } as Response);
  }

  private createJwt(accountId: string): string {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      "https://api.openai.com/auth.chatgpt_account_id": accountId,
    })).toString("base64url");
    return `${header}.${payload}.signature`;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  new CodexRateLimitService().clearMemoryCacheForTests();
});

test("CodexRateLimitService stores Codex usage snapshots with account-scoped headers", async () => {
  const factory = new CodexRateLimitServiceTestFactory();
  const service = new CodexRateLimitService();
  const transactionProvider = factory.createTransactionProvider();
  const fetchSpy = factory.mockCodexUsageResponse({
    additional_rate_limits: [
      {
        limit_name: "Apply Patch",
        metered_feature: "apply_patch",
        rate_limit: {
          primary_window: {
            reset_at: "2026-04-28T12:00:00.000Z",
            used_percent: 15,
            window_minutes: 300,
          },
        },
      },
    ],
    credits: {
      balance: "42",
      has_credits: true,
      unlimited: false,
    },
    plan_type: "pro",
    rate_limit: {
      primary_window: {
        reset_at: "2026-04-28T11:00:00.000Z",
        used_percent: 30,
        window_minutes: 300,
      },
      secondary_window: {
        reset_at: "2026-04-28T16:00:00.000Z",
        used_percent: 70,
        window_minutes: 10080,
      },
    },
  });

  await service.refreshCredentialLimits(
    transactionProvider,
    factory.createCredential(),
    new Date("2026-04-28T10:00:00.000Z"),
  );

  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://chatgpt.com/backend-api/wham/usage");
  expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({
    headers: expect.objectContaining({
      "chatgpt-account-id": "account-123",
      originator: "pi",
    }),
  });
  expect(transactionProvider.upserts).toHaveLength(2);
  expect(transactionProvider.upserts[0]?.record).toMatchObject({
    companyId: "11111111-1111-4111-8111-111111111111",
    limitId: "codex",
    planType: "pro",
    primaryUsedPercent: 30,
    secondaryUsedPercent: 70,
  });
  expect(transactionProvider.upserts[1]?.record).toMatchObject({
    limitId: "apply_patch",
    limitName: "Apply Patch",
    primaryUsedPercent: 15,
  });
  expect(transactionProvider.deleteCount).toBe(1);
});

test("CodexRateLimitService stores platform credential snapshots in the platform table", async () => {
  const factory = new CodexRateLimitServiceTestFactory();
  const service = new CodexRateLimitService();
  const transactionProvider = factory.createTransactionProvider();
  factory.mockCodexUsageResponse({
    rate_limit: {
      primary_window: {
        used_percent: 10,
      },
    },
  });

  await service.refreshCredentialLimits(
    transactionProvider,
    factory.createCredential({
      credentialId: "33333333-3333-4333-8333-333333333333",
      credentialSource: "platform",
    }),
    new Date("2026-04-28T10:00:00.000Z"),
  );

  expect(transactionProvider.upserts).toHaveLength(1);
  expect(transactionProvider.upserts[0]?.record).toMatchObject({
    platformModelProviderCredentialId: "33333333-3333-4333-8333-333333333333",
    limitId: "codex",
    primaryUsedPercent: 10,
  });
  expect(transactionProvider.upserts[0]?.record).not.toHaveProperty("companyId");
  expect(transactionProvider.deleteCount).toBe(1);
});

test("CodexRateLimitService throttles refreshes per credential for five minutes", async () => {
  const factory = new CodexRateLimitServiceTestFactory();
  const service = new CodexRateLimitService();
  const transactionProvider = factory.createTransactionProvider();
  const fetchSpy = factory.mockCodexUsageResponse({
    rate_limit: {
      primary_window: {
        used_percent: 10,
      },
    },
  });
  const credential = factory.createCredential();

  await service.refreshCredentialLimits(transactionProvider, credential, new Date("2026-04-28T10:00:00.000Z"));
  await service.refreshCredentialLimits(transactionProvider, credential, new Date("2026-04-28T10:04:59.000Z"));
  await service.refreshCredentialLimits(transactionProvider, credential, new Date("2026-04-28T10:05:00.000Z"));

  expect(fetchSpy).toHaveBeenCalledTimes(2);
  expect(transactionProvider.upserts).toHaveLength(2);
});
