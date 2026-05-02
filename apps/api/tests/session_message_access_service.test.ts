import assert from "node:assert/strict";
import { test } from "vitest";
import { messageContents } from "../src/db/schema.ts";
import { PastMessageAccessService } from "../src/services/session_messages/access_service.ts";

type QueryKind = "contents" | "messages";

class SessionMessageAccessServiceTestHarness {
  static createTransactionProvider(input: {
    contentRows?: Array<Record<string, unknown>>;
    messageRows?: Array<Record<string, unknown>>;
  }) {
    const selectedTables: QueryKind[] = [];
    const database = {
      select() {
        return {
          from(table: unknown) {
            const queryKind: QueryKind = table === messageContents ? "contents" : "messages";
            selectedTables.push(queryKind);
            return {
              innerJoin() {
                return {
                  where() {
                    return {
                      orderBy() {
                        return {
                          async limit() {
                            return input.messageRows ?? [];
                          },
                        };
                      },
                    };
                  },
                };
              },
              where() {
                if (queryKind === "contents") {
                  return {
                    async orderBy() {
                      return input.contentRows ?? [];
                    },
                  };
                }

                return input.messageRows ?? [];
              },
            };
          },
        };
      },
    };

    return {
      selectedTables,
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback(database);
      },
    };
  }

  static createMessage(id: string, createdAt: string) {
    return {
      id,
      sessionId: "session-1",
      turnId: "turn-1",
      role: "assistant",
      status: "completed",
      toolCallId: null,
      toolName: null,
      principalAgentId: null,
      principalSessionId: null,
      principalType: "user",
      taskRunId: null,
      workflowRunId: null,
      isError: false,
      errorMessage: null,
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
    };
  }
}

test("PastMessageAccessService lists agent messages with filtered contents and cursor pagination", async () => {
  const transactionProvider = SessionMessageAccessServiceTestHarness.createTransactionProvider({
    messageRows: [
      SessionMessageAccessServiceTestHarness.createMessage("message-2", "2026-05-02T10:02:00.000Z"),
      SessionMessageAccessServiceTestHarness.createMessage("message-1", "2026-05-02T10:01:00.000Z"),
    ],
    contentRows: [{
      id: "content-1",
      messageId: "message-2",
      type: "text",
      text: "newest",
      data: null,
      mimeType: null,
      structuredContent: null,
      toolCallId: null,
      toolName: null,
      arguments: null,
      createdAt: new Date("2026-05-02T10:02:01.000Z"),
      updatedAt: new Date("2026-05-02T10:02:01.000Z"),
    }],
  });
  const service = new PastMessageAccessService();

  const result = await service.listMessages(transactionProvider as never, {
    agentId: "agent-1",
    companyId: "company-123",
    contentTypes: ["text"],
    limit: 1,
  });

  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0]?.id, "message-2");
  assert.equal(result.messages[0]?.contents?.[0]?.text, "newest");
  assert.equal(
    result.nextCursor,
    Buffer.from("past-message:2026-05-02T10:02:00.000Z|message-2", "utf8").toString("base64url"),
  );
  assert.deepEqual(transactionProvider.selectedTables, ["messages", "contents"]);
});

test("PastMessageAccessService omits contents when includeContents is false", async () => {
  const transactionProvider = SessionMessageAccessServiceTestHarness.createTransactionProvider({
    messageRows: [SessionMessageAccessServiceTestHarness.createMessage("message-1", "2026-05-02T10:01:00.000Z")],
  });
  const service = new PastMessageAccessService();

  const result = await service.listMessages(transactionProvider as never, {
    agentId: "agent-1",
    companyId: "company-123",
    includeContents: false,
  });

  assert.equal(result.messages[0]?.id, "message-1");
  assert.equal("contents" in (result.messages[0] as Record<string, unknown>), false);
  assert.deepEqual(transactionProvider.selectedTables, ["messages"]);
});

test("PastMessageAccessService rejects blank search queries before querying", async () => {
  const transactionProvider = SessionMessageAccessServiceTestHarness.createTransactionProvider({});
  const service = new PastMessageAccessService();

  await assert.rejects(
    service.searchMessages(transactionProvider as never, {
      agentId: "agent-1",
      companyId: "company-123",
      query: "   ",
    }),
    /query is required/,
  );
  assert.deepEqual(transactionProvider.selectedTables, []);
});
