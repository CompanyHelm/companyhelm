import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { GithubWebhookProcessor } from "../src/github/webhooks/processor.ts";
import type { GithubWebhookJobPayload } from "../src/github/webhooks/queue.ts";

type SqlCall = {
  query: string;
  values: unknown[];
};

type SqlMock = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Array<Record<string, unknown>>>;
  begin(callback: (transactionSql: SqlMock) => Promise<void>): Promise<void>;
};

class GithubWebhookProcessorTestHarness {
  static createAdminDatabaseMock(installationRows: Array<Record<string, unknown>>) {
    const calls: SqlCall[] = [];
    const sql = (async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<Array<Record<string, unknown>>> => {
      const query = strings.join("?");
      calls.push({
        query,
        values,
      });

      if (query.includes('FROM "company_github_installations"') && query.includes("SELECT")) {
        return installationRows;
      }

      return [];
    }) as SqlMock;
    sql.begin = async (callback: (transactionSql: SqlMock) => Promise<void>) => {
      await callback(sql);
    };

    return {
      calls,
      getSqlClient() {
        return sql;
      },
    };
  }

  static createJob(eventName: string, payload: Record<string, unknown>): GithubWebhookJobPayload {
    return {
      deliveryId: "delivery-1",
      eventName,
      payload: JSON.stringify(payload),
      receivedAt: "2026-04-18T00:00:00.000Z",
      signature: "sha256=signature",
    };
  }

  static createRepositoryPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      archived: false,
      default_branch: "main",
      full_name: "acme/widgets",
      html_url: "https://github.com/acme/widgets",
      id: 987,
      name: "widgets",
      private: true,
      ...overrides,
    };
  }
}

test("GithubWebhookProcessor deletes installations when GitHub reports installation deletion", async () => {
  const adminDatabase = GithubWebhookProcessorTestHarness.createAdminDatabaseMock([]);
  const processor = new GithubWebhookProcessor(adminDatabase as never);

  await processor.process(GithubWebhookProcessorTestHarness.createJob("installation", {
    action: "deleted",
    installation: {
      id: 123,
    },
  }));

  assert.equal(adminDatabase.calls.length, 1);
  assert.match(adminDatabase.calls[0]?.query ?? "", /DELETE FROM "company_github_installations"/);
  assert.equal(adminDatabase.calls[0]?.values[0], 123);
});

test("GithubWebhookProcessor upserts repositories added to linked installations", async () => {
  const adminDatabase = GithubWebhookProcessorTestHarness.createAdminDatabaseMock([{
    companyId: "company-1",
  }]);
  const processor = new GithubWebhookProcessor(adminDatabase as never);

  await processor.process(GithubWebhookProcessorTestHarness.createJob("installation_repositories", {
    action: "added",
    installation: {
      id: 123,
    },
    repositories_added: [
      GithubWebhookProcessorTestHarness.createRepositoryPayload(),
    ],
  }));

  assert.equal(adminDatabase.calls.length, 2);
  assert.match(adminDatabase.calls[0]?.query ?? "", /SELECT "company_id"/);
  assert.match(adminDatabase.calls[1]?.query ?? "", /INSERT INTO "github_repositories"/);
  assert.match(adminDatabase.calls[1]?.query ?? "", /ON CONFLICT/);
  assert.equal(adminDatabase.calls[1]?.values[1], "company-1");
  assert.equal(adminDatabase.calls[1]?.values[2], 123);
  assert.equal(adminDatabase.calls[1]?.values[3], "987");
  assert.equal(adminDatabase.calls[1]?.values[4], "widgets");
  assert.equal(adminDatabase.calls[1]?.values[5], "acme/widgets");
});

test("GithubWebhookProcessor removes repositories removed from linked installations", async () => {
  const adminDatabase = GithubWebhookProcessorTestHarness.createAdminDatabaseMock([{
    companyId: "company-1",
  }]);
  const processor = new GithubWebhookProcessor(adminDatabase as never);

  await processor.process(GithubWebhookProcessorTestHarness.createJob("installation_repositories", {
    action: "removed",
    installation: {
      id: 123,
    },
    repositories_removed: [
      GithubWebhookProcessorTestHarness.createRepositoryPayload(),
    ],
  }));

  assert.equal(adminDatabase.calls.length, 2);
  assert.match(adminDatabase.calls[1]?.query ?? "", /DELETE FROM "github_repositories"/);
  assert.equal(adminDatabase.calls[1]?.values[0], "company-1");
  assert.equal(adminDatabase.calls[1]?.values[1], 123);
  assert.equal(adminDatabase.calls[1]?.values[2], "987");
});

test("GithubWebhookProcessor ignores repository cache updates for unlinked installations", async () => {
  const adminDatabase = GithubWebhookProcessorTestHarness.createAdminDatabaseMock([]);
  const processor = new GithubWebhookProcessor(adminDatabase as never);

  await processor.process(GithubWebhookProcessorTestHarness.createJob("repository", {
    action: "renamed",
    installation: {
      id: 123,
    },
    repository: GithubWebhookProcessorTestHarness.createRepositoryPayload({
      full_name: "acme/renamed-widgets",
      name: "renamed-widgets",
    }),
  }));

  assert.equal(adminDatabase.calls.length, 1);
  assert.match(adminDatabase.calls[0]?.query ?? "", /SELECT "company_id"/);
});

test("GithubWebhookProcessor routes tracked pull request activity to the owning session", async () => {
  const adminDatabase = GithubWebhookProcessorTestHarness.createAdminDatabaseMock([{
    companyId: "company-1",
  }]);
  const queuedPrompts: Array<Record<string, unknown>> = [];
  const notifications: Array<Record<string, unknown>> = [];
  const processor = new GithubWebhookProcessor(
    adminDatabase as never,
    {
      async withCompanyContext(companyId: string, callback: (tx: unknown) => Promise<unknown>) {
        return callback({
          companyId,
        });
      },
    } as never,
    {
      normalizeGithubState(value: string) {
        return value.toLowerCase();
      },
      async updateTrackedPullRequestFromWebhook(_transactionProvider: unknown, input: Record<string, unknown>) {
        assert.equal(input.companyId, "company-1");
        assert.equal(input.installationId, 123);
        assert.equal(input.number, 42);
        assert.equal(input.repositoryExternalId, "987");
        return {
          id: "tracked-pr-1",
          ownerAgentId: null,
          ownerSessionId: "session-1",
        };
      },
    } as never,
    {
      async queuePromptInTransaction(
        _selectableDatabase: unknown,
        _insertableDatabase: unknown,
        _updatableDatabase: unknown,
        companyId: string,
        sessionId: string,
        userMessage: string,
        options: Record<string, unknown>,
      ) {
        queuedPrompts.push({
          companyId,
          options,
          sessionId,
          userMessage,
        });
        return {};
      },
      async notifyQueuedSessionMessage(companyId: string, sessionId: string, shouldSteer: boolean) {
        notifications.push({
          companyId,
          sessionId,
          shouldSteer,
        });
      },
    } as never,
  );

  await processor.process(GithubWebhookProcessorTestHarness.createJob("pull_request", {
    action: "synchronize",
    installation: {
      id: 123,
    },
    pull_request: {
      html_url: "https://github.com/acme/widgets/pull/42",
      id: 456,
      number: 42,
      state: "open",
      title: "Update widgets",
    },
    repository: GithubWebhookProcessorTestHarness.createRepositoryPayload(),
  }));

  assert.equal(queuedPrompts.length, 1);
  assert.equal(queuedPrompts[0]?.companyId, "company-1");
  assert.equal(queuedPrompts[0]?.sessionId, "session-1");
  assert.match(String(queuedPrompts[0]?.userMessage), /GitHub pull request activity on acme\/widgets#42/);
  assert.deepEqual(queuedPrompts[0]?.options, {
    principalMetadata: {
      principalType: "github_webhook",
    },
    shouldSteer: true,
  });
  assert.deepEqual(notifications, [{
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: true,
  }]);
});
