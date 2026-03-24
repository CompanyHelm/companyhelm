import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import type { OAuthCredentials } from "@mariozechner/pi-ai/oauth";
import { ApiLogger } from "../src/log/api_logger.ts";
import {
  LlmOauthRefreshWorker,
  type LlmOauthCredentialRow,
} from "../src/workers/llm_oauth_refresh_worker.ts";

type QueryCall = {
  query: string;
  values: unknown[];
};

class LlmOauthRefreshWorkerTestHarness {
  static createAdminDatabaseMock(rows: unknown[]) {
    const queryCalls: QueryCall[] = [];
    const updateCalls: unknown[][] = [];

    const transactionSql = async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<unknown[]> => {
      const query = strings.join("?");
      queryCalls.push({
        query,
        values,
      });

      if (query.includes("FOR UPDATE SKIP LOCKED")) {
        return rows;
      }

      if (query.includes("UPDATE \"model_provider_credentials\"")) {
        updateCalls.push(values);
        return [];
      }

      throw new Error(`Unexpected query: ${query}`);
    };

    return {
      queryCalls,
      updateCalls,
      getSqlClient() {
        return {
          begin: async (callback: (sql: typeof transactionSql) => Promise<void>) => {
            await callback(transactionSql);
          },
        };
      },
    };
  }

  static createLoggerMock(loggedErrors: Array<{ bindings: Record<string, unknown>; arguments_: unknown[] }>) {
    return {
      child(bindings: Record<string, unknown>) {
        return {
          info() {
            return undefined;
          },
          debug() {
            return undefined;
          },
          error(...arguments_: unknown[]) {
            loggedErrors.push({
              bindings,
              arguments_,
            });
          },
        };
      },
    } as ApiLogger;
  }
}

class TestLlmOauthRefreshWorker extends LlmOauthRefreshWorker {
  readonly refreshCalls: Array<{ id: string; modelProvider: string }> = [];
  private readonly refreshedCredentialsById: Record<string, OAuthCredentials>;
  private readonly failingCredentialIds: Set<string>;

  constructor(
    adminDatabase: unknown,
    logger: ApiLogger,
    refreshedCredentialsById: Record<string, OAuthCredentials>,
    failingCredentialIds: string[] = [],
  ) {
    super(adminDatabase as never, logger);
    this.refreshedCredentialsById = refreshedCredentialsById;
    this.failingCredentialIds = new Set(failingCredentialIds);
  }

  async runNow(): Promise<void> {
    await this.run();
  }

  protected override async refreshCredential(credential: LlmOauthCredentialRow): Promise<OAuthCredentials> {
    this.refreshCalls.push({
      id: String(credential.id),
      modelProvider: String(credential.modelProvider),
    });

    if (this.failingCredentialIds.has(String(credential.id))) {
      throw new Error(`refresh failed for ${credential.id}`);
    }

    const refreshedCredential = this.refreshedCredentialsById[String(credential.id)];
    if (!refreshedCredential) {
      throw new Error(`Missing refreshed credential for ${credential.id}`);
    }

    return refreshedCredential;
  }
}

test("LlmOauthRefreshWorker locks expiring oauth credentials and stores refreshed tokens", async () => {
  const loggedErrors: Array<{ bindings: Record<string, unknown>; arguments_: unknown[] }> = [];
  const adminDatabase = LlmOauthRefreshWorkerTestHarness.createAdminDatabaseMock([{
    id: "credential-1",
    modelProvider: "openai",
    encryptedApiKey: "old-access-token",
    refreshToken: "old-refresh-token",
    accessTokenExpiresAtMilliseconds: 1774254000000,
  }]);
  const logger = LlmOauthRefreshWorkerTestHarness.createLoggerMock(loggedErrors);
  const worker = new TestLlmOauthRefreshWorker(adminDatabase, logger, {
    "credential-1": {
      access: "new-access-token",
      refresh: "new-refresh-token",
      expires: 1774257600000,
    },
  });

  await worker.runNow();

  assert.deepEqual(worker.refreshCalls, [{
    id: "credential-1",
    modelProvider: "openai",
  }]);
  assert.match(adminDatabase.queryCalls[0]?.query ?? "", /FOR UPDATE SKIP LOCKED/);
  assert.equal(typeof adminDatabase.queryCalls[0]?.values[0], "string");
  assert.equal(adminDatabase.queryCalls[0]?.values[1], 20);
  assert.equal(adminDatabase.updateCalls.length, 1);
  assert.equal(adminDatabase.updateCalls[0]?.[0], "new-access-token");
  assert.equal(adminDatabase.updateCalls[0]?.[1], "new-refresh-token");
  assert.equal(typeof adminDatabase.updateCalls[0]?.[2], "string");
  assert.equal(typeof adminDatabase.updateCalls[0]?.[3], "string");
  assert.equal(typeof adminDatabase.updateCalls[0]?.[4], "string");
  assert.equal(adminDatabase.updateCalls[0]?.[5], "credential-1");
  assert.equal(loggedErrors.length, 0);
});

test("LlmOauthRefreshWorker continues refreshing later rows when one refresh fails", async () => {
  const loggedErrors: Array<{ bindings: Record<string, unknown>; arguments_: unknown[] }> = [];
  const adminDatabase = LlmOauthRefreshWorkerTestHarness.createAdminDatabaseMock([
    {
      id: "credential-1",
      modelProvider: "openai",
      encryptedApiKey: "old-access-token-1",
      refreshToken: "old-refresh-token-1",
      accessTokenExpiresAtMilliseconds: 1774254000000,
    },
    {
      id: "credential-2",
      modelProvider: "openai",
      encryptedApiKey: "old-access-token-2",
      refreshToken: "old-refresh-token-2",
      accessTokenExpiresAtMilliseconds: 1774254300000,
    },
  ]);
  const logger = LlmOauthRefreshWorkerTestHarness.createLoggerMock(loggedErrors);
  const worker = new TestLlmOauthRefreshWorker(
    adminDatabase,
    logger,
    {
      "credential-2": {
        access: "new-access-token-2",
        refresh: "new-refresh-token-2",
        expires: 1774257900000,
      },
    },
    ["credential-1"],
  );
  await worker.runNow();

  assert.deepEqual(worker.refreshCalls, [
    {
      id: "credential-1",
      modelProvider: "openai",
    },
    {
      id: "credential-2",
      modelProvider: "openai",
    },
  ]);
  assert.equal(adminDatabase.updateCalls.length, 1);
  assert.equal(adminDatabase.updateCalls[0]?.[5], "credential-2");
  assert.equal(loggedErrors.length, 1);
  assert.deepEqual(loggedErrors[0]?.bindings, {
    worker: "llm_oauth_refresh",
  });
  assert.deepEqual(loggedErrors[0]?.arguments_[0], {
    credentialId: "credential-1",
    error: "refresh failed for credential-1",
  });
});
