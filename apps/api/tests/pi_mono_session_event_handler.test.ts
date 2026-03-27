import assert from "node:assert/strict";
import { test } from "vitest";
import { agentSessions, messageContents, sessionMessages } from "../src/db/schema.ts";
import { PiMonoSessionEventHandler } from "../src/services/agent/session/pi-mono/session_event_handler.ts";

type SessionMessageRecord = Record<string, unknown> & {
  id: string;
  role: string;
  sessionId: string;
  status: string;
};

type MessageContentRecord = Record<string, unknown> & {
  id: string;
  messageId: string;
  type: string;
};

class PiMonoSessionEventHandlerTestHarness {
  static create() {
    const sessionStatusUpdates: Array<Record<string, unknown>> = [];
    const sessionMessageRecords = new Map<string, SessionMessageRecord>();
    const messageContentRecordsByMessageId = new Map<string, MessageContentRecord[]>();
    const publishCalls: Array<{ channel: string; message: string }> = [];
    const infoLogs: unknown[] = [];
    const errorLogs: unknown[] = [];
    const sessionState = {
      isThinking: false,
      status: "stopped",
      thinkingText: null as string | null,
    };
    const originalInfo = console.info;
    const originalError = console.error;

    console.info = (...args: unknown[]) => {
      infoLogs.push(args);
    };
    console.error = (...args: unknown[]) => {
      errorLogs.push(args);
    };

    return {
      errorLogs,
      infoLogs,
      messageContentRecordsByMessageId,
      publishCalls,
      redisService: {
        async getClient() {
          return {
            async publish(channel: string, message: string) {
              publishCalls.push({
                channel,
                message,
              });
              return 1;
            },
          };
        },
      },
      sessionMessageRecords,
      sessionStatusUpdates,
      sessionState,
      transactionProvider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
          return callback({
            insert(table: unknown) {
              return {
                async values(value: Record<string, unknown> | Array<Record<string, unknown>>) {
                  if (table === sessionMessages) {
                    const sessionMessageRecord = value as SessionMessageRecord;
                    sessionMessageRecords.set(sessionMessageRecord.id, sessionMessageRecord);
                    return undefined;
                  }

                  if (table === messageContents) {
                    const contentRecords = Array.isArray(value)
                      ? value as MessageContentRecord[]
                      : [value as MessageContentRecord];
                    const messageId = contentRecords[0]?.messageId;
                    if (!messageId) {
                      return undefined;
                    }

                    const existingRecords = messageContentRecordsByMessageId.get(messageId) ?? [];
                    messageContentRecordsByMessageId.set(messageId, [
                      ...existingRecords,
                      ...contentRecords,
                    ]);
                    return undefined;
                  }

                  throw new Error("Unexpected insert table.");
                },
              };
            },
            select() {
              return {
                from(table: unknown) {
                  if (table !== agentSessions) {
                    throw new Error("Unexpected select table.");
                  }

                  return {
                    async where() {
                      return [{
                        companyId: "company-1",
                      }];
                    },
                  };
                },
              };
            },
            update(table: unknown) {
              if (table === agentSessions) {
                return {
                  set(value: Record<string, unknown>) {
                    sessionStatusUpdates.push(value);
                    return {
                      async where() {
                        if (typeof value.status === "string") {
                          sessionState.status = value.status;
                        }
                        if (typeof value.isThinking === "boolean") {
                          sessionState.isThinking = value.isThinking;
                        }
                        if ("thinkingText" in value) {
                          sessionState.thinkingText = typeof value.thinkingText === "string" ? value.thinkingText : null;
                        }
                        return undefined;
                      },
                    };
                  },
                };
              }

              if (table === sessionMessages) {
                return {
                  set(value: Record<string, unknown>) {
                    return {
                      async where() {
                        const [messageId] = Array.from(sessionMessageRecords.keys()).slice(-1);
                        if (!messageId) {
                          return undefined;
                        }

                        const existingMessageRecord = sessionMessageRecords.get(messageId);
                        if (!existingMessageRecord) {
                          return undefined;
                        }

                        sessionMessageRecords.set(messageId, {
                          ...existingMessageRecord,
                          ...value,
                        });
                      },
                    };
                  },
                };
              }

              if (table === messageContents) {
                return {
                  set(value: Record<string, unknown>) {
                    return {
                      async where() {
                        const [messageId] = Array.from(messageContentRecordsByMessageId.keys()).slice(-1);
                        if (!messageId) {
                          return undefined;
                        }

                        const existingRecords = messageContentRecordsByMessageId.get(messageId) ?? [];
                        const nextType = String(value.type ?? "");
                        let hasUpdatedRecord = false;
                        messageContentRecordsByMessageId.set(
                          messageId,
                          existingRecords.map((record) => {
                            if (hasUpdatedRecord) {
                              return record;
                            }
                            if (nextType.length > 0 && record.type !== nextType) {
                              return record;
                            }

                            hasUpdatedRecord = true;
                            return {
                              ...record,
                              ...value,
                            };
                          }),
                        );
                      },
                    };
                  },
                };
              }

              throw new Error("Unexpected update table.");
            },
            delete(table: unknown) {
              if (table === messageContents) {
                return {
                  async where() {
                    const [messageId] = Array.from(messageContentRecordsByMessageId.keys()).slice(-1);
                    if (!messageId) {
                      return undefined;
                    }

                    const existingRecords = messageContentRecordsByMessageId.get(messageId) ?? [];
                    if (existingRecords.length === 0) {
                      return undefined;
                    }

                    messageContentRecordsByMessageId.set(messageId, existingRecords.slice(0, -1));
                    return undefined;
                  },
                };
              }

              throw new Error("Unexpected delete table.");
            },
          });
        },
      },
      restore() {
        console.info = originalInfo;
        console.error = originalError;
      },
    };
  }
}

test("PiMonoSessionEventHandler marks the session running on agent start", async () => {
  const harness = PiMonoSessionEventHandlerTestHarness.create();
  const handler = new PiMonoSessionEventHandler(
    harness.transactionProvider as never,
    "session-1",
    harness.redisService as never,
  );

  try {
    await handler.handle({
      type: "agent_start",
    });
  } finally {
    harness.restore();
  }

  assert.equal(harness.sessionStatusUpdates.length, 1);
  assert.equal(harness.sessionStatusUpdates[0]?.status, "running");
  assert.equal(harness.sessionStatusUpdates[0]?.isThinking, false);
  assert.equal(harness.sessionStatusUpdates[0]?.thinkingText, null);
  assert.ok(harness.sessionStatusUpdates[0]?.updated_at instanceof Date);
  assert.equal(harness.sessionState.status, "running");
  assert.equal(harness.sessionState.isThinking, false);
  assert.equal(harness.sessionState.thinkingText, null);
  assert.deepEqual(harness.publishCalls, [{
    channel: "company:company-1:session:session-1:update",
    message: "",
  }]);
});

test("PiMonoSessionEventHandler marks the session stopped on agent end", async () => {
  const harness = PiMonoSessionEventHandlerTestHarness.create();
  const handler = new PiMonoSessionEventHandler(
    harness.transactionProvider as never,
    "session-1",
    harness.redisService as never,
  );

  try {
    await handler.handle({
      type: "agent_end",
    });
  } finally {
    harness.restore();
  }

  assert.equal(harness.sessionStatusUpdates.length, 1);
  assert.equal(harness.sessionStatusUpdates[0]?.status, "stopped");
  assert.equal(harness.sessionStatusUpdates[0]?.isThinking, false);
  assert.equal(harness.sessionStatusUpdates[0]?.thinkingText, null);
  assert.ok(harness.sessionStatusUpdates[0]?.updated_at instanceof Date);
  assert.equal(harness.sessionState.status, "stopped");
  assert.equal(harness.sessionState.isThinking, false);
  assert.equal(harness.sessionState.thinkingText, null);
  assert.deepEqual(harness.publishCalls, [{
    channel: "company:company-1:session:session-1:update",
    message: "",
  }]);
});

test("PiMonoSessionEventHandler persists assistant messages across start update and end", async () => {
  const harness = PiMonoSessionEventHandlerTestHarness.create();
  const handler = new PiMonoSessionEventHandler(
    harness.transactionProvider as never,
    "session-1",
    harness.redisService as never,
  );

  try {
    await handler.handle({
      message: {
        content: [],
        role: "assistant",
        timestamp: 1000,
      },
      type: "message_start",
    });
    await handler.handle({
      message: {
        content: [
          {
            text: "Drafting",
            type: "text",
          },
        ],
        role: "assistant",
        timestamp: 1000,
      },
      type: "message_update",
    });
    await handler.handle({
      message: {
        content: [
          {
            text: "Drafting complete",
            type: "text",
          },
          {
            arguments: {
              path: "README.md",
            },
            id: "tool-call-1",
            name: "read_file",
            type: "toolCall",
          },
        ],
        role: "assistant",
        timestamp: 1000,
      },
      type: "message_end",
    });
  } finally {
    harness.restore();
  }

  assert.equal(harness.errorLogs.length, 0);
  assert.equal(harness.sessionMessageRecords.size, 1);
  assert.equal(harness.publishCalls.length, 3);
  assert.match(harness.publishCalls[0]?.channel ?? "", /^company:company-1:session:session-1:message:[^:]+:update$/);
  assert.equal(harness.publishCalls[0]?.message, "");
  assert.equal(harness.publishCalls[1]?.channel, harness.publishCalls[0]?.channel);
  assert.equal(harness.publishCalls[1]?.message, "");
  assert.equal(harness.publishCalls[2]?.channel, harness.publishCalls[0]?.channel);
  assert.equal(harness.publishCalls[2]?.message, "");

  const [messageRecord] = Array.from(harness.sessionMessageRecords.values());
  assert.equal(messageRecord?.companyId, "company-1");
  assert.equal(messageRecord?.role, "assistant");
  assert.equal(messageRecord?.sessionId, "session-1");
  assert.equal(messageRecord?.status, "completed");
  assert.equal(messageRecord?.toolCallId, "tool-call-1");
  assert.equal(messageRecord?.toolName, "read_file");
  assert.ok(messageRecord?.updatedAt instanceof Date);

  const messageContentRecords = harness.messageContentRecordsByMessageId.get(messageRecord.id);
  assert.equal(messageContentRecords?.length, 2);
  assert.deepEqual(
    messageContentRecords?.map((record) => {
      return {
        arguments: record.arguments,
        text: record.text,
        toolCallId: record.toolCallId,
        toolName: record.toolName,
        type: record.type,
      };
    }),
    [
      {
        arguments: undefined,
        text: "Drafting complete",
        toolCallId: undefined,
        toolName: undefined,
        type: "text",
      },
      {
        arguments: {
          path: "README.md",
        },
        text: undefined,
        toolCallId: "tool-call-1",
        toolName: "read_file",
        type: "toolCall",
      },
    ],
  );
});

test("PiMonoSessionEventHandler stores session thinking state from assistant thinking events", async () => {
  const harness = PiMonoSessionEventHandlerTestHarness.create();
  const handler = new PiMonoSessionEventHandler(
    harness.transactionProvider as never,
    "session-1",
    harness.redisService as never,
  );

  try {
    await handler.handle({
      assistantMessageEvent: {
        contentIndex: 0,
        type: "thinking_start",
      },
      message: {
        content: [],
        role: "assistant",
        timestamp: 1500,
      },
      type: "message_update",
    });
    await handler.handle({
      assistantMessageEvent: {
        contentIndex: 0,
        delta: "Inspecting the repo",
        type: "thinking_delta",
      },
      message: {
        content: [],
        role: "assistant",
        timestamp: 1500,
      },
      type: "message_update",
    });
    await handler.handle({
      assistantMessageEvent: {
        contentIndex: 0,
        type: "thinking_end",
      },
      message: {
        content: [],
        role: "assistant",
        timestamp: 1500,
      },
      type: "message_update",
    });
  } finally {
    harness.restore();
  }

  const sessionUpdateChannels = harness.publishCalls
    .filter((call) => call.channel === "company:company-1:session:session-1:update");
  assert.equal(sessionUpdateChannels.length, 3);
  assert.equal(harness.sessionState.isThinking, false);
  assert.equal(harness.sessionState.thinkingText, null);
  assert.deepEqual(
    harness.sessionStatusUpdates.map((update) => {
      return {
        isThinking: update.isThinking,
        thinkingText: update.thinkingText,
      };
    }),
    [
      {
        isThinking: true,
        thinkingText: null,
      },
      {
        isThinking: true,
        thinkingText: "Inspecting the repo",
      },
      {
        isThinking: false,
        thinkingText: null,
      },
    ],
  );
});

test("PiMonoSessionEventHandler stores user messages only when message end arrives", async () => {
  const harness = PiMonoSessionEventHandlerTestHarness.create();
  const handler = new PiMonoSessionEventHandler(
    harness.transactionProvider as never,
    "session-1",
    harness.redisService as never,
  );

  try {
    await handler.handle({
      message: {
        role: "user",
        timestamp: 2000,
      },
      type: "message_start",
    });
    await handler.handle({
      message: {
        content: "Write the launch email.",
        role: "user",
        timestamp: 2000,
      },
      type: "message_end",
    });
  } finally {
    harness.restore();
  }

  assert.equal(harness.errorLogs.length, 0);
  assert.equal(harness.sessionMessageRecords.size, 1);
  assert.equal(harness.publishCalls.length, 1);
  assert.match(harness.publishCalls[0]?.channel ?? "", /^company:company-1:session:session-1:message:[^:]+:update$/);
  assert.equal(harness.publishCalls[0]?.message, "");

  const [messageRecord] = Array.from(harness.sessionMessageRecords.values());
  assert.equal(messageRecord?.role, "user");
  assert.equal(messageRecord?.status, "completed");

  const messageContentRecords = harness.messageContentRecordsByMessageId.get(messageRecord.id);
  assert.deepEqual(
    messageContentRecords?.map((record) => {
      return {
        text: record.text,
        type: record.type,
      };
    }),
    [
      {
        text: "Write the launch email.",
        type: "text",
      },
    ],
  );
});

test("PiMonoSessionEventHandler uses the queued user message timestamp when persisting the user row", async () => {
  const harness = PiMonoSessionEventHandlerTestHarness.create();
  const handler = new PiMonoSessionEventHandler(
    harness.transactionProvider as never,
    "session-1",
    harness.redisService as never,
  );
  const queuedTimestamp = new Date("2026-03-27T18:00:00.000Z");

  try {
    handler.queueUserMessageTimestamp(queuedTimestamp);
    await handler.handle({
      message: {
        content: "Keep the original queue ordering.",
        role: "user",
        timestamp: 9999999999999,
      },
      type: "message_end",
    });
  } finally {
    harness.restore();
  }

  const [messageRecord] = Array.from(harness.sessionMessageRecords.values());
  assert.ok(messageRecord);
  assert.equal((messageRecord.createdAt as Date).toISOString(), queuedTimestamp.toISOString());
  assert.equal((messageRecord.updatedAt as Date).toISOString(), queuedTimestamp.toISOString());
});

test("PiMonoSessionEventHandler removes stale content rows when a later snapshot shrinks", async () => {
  const harness = PiMonoSessionEventHandlerTestHarness.create();
  const handler = new PiMonoSessionEventHandler(
    harness.transactionProvider as never,
    "session-1",
    harness.redisService as never,
  );

  try {
    await handler.handle({
      message: {
        content: [
          {
            text: "First half",
            type: "text",
          },
          {
            text: "Second half",
            type: "text",
          },
        ],
        role: "assistant",
        timestamp: 3000,
      },
      type: "message_update",
    });
    await handler.handle({
      message: {
        content: [
          {
            text: "First half\nSecond half",
            type: "text",
          },
        ],
        role: "assistant",
        timestamp: 3000,
      },
      type: "message_end",
    });
  } finally {
    harness.restore();
  }

  const [messageRecord] = Array.from(harness.sessionMessageRecords.values());
  assert.ok(messageRecord);
  const messageContentRecords = harness.messageContentRecordsByMessageId.get(messageRecord.id);
  assert.deepEqual(
    messageContentRecords?.map((record) => {
      return {
        text: record.text,
        type: record.type,
      };
    }),
    [
      {
        text: "First half\nSecond half",
        type: "text",
      },
    ],
  );
});

test("PiMonoSessionEventHandler serializes concurrent assistant updates for the same message", async () => {
  const harness = PiMonoSessionEventHandlerTestHarness.create();
  const originalTransaction = harness.transactionProvider.transaction;
  harness.transactionProvider.transaction = async (callback: (tx: unknown) => Promise<unknown>) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return originalTransaction(callback);
  };
  const handler = new PiMonoSessionEventHandler(
    harness.transactionProvider as never,
    "session-1",
    harness.redisService as never,
  );

  try {
    await handler.handle({
      message: {
        content: [],
        role: "assistant",
        timestamp: 4000,
      },
      type: "message_start",
    });
    await Promise.all([
      handler.handle({
        message: {
          content: [
            {
              text: "READY",
              type: "text",
            },
          ],
          role: "assistant",
          timestamp: 4000,
        },
        type: "message_update",
      }),
      handler.handle({
        message: {
          content: [
            {
              text: "READY",
              type: "text",
            },
          ],
          role: "assistant",
          timestamp: 4000,
        },
        type: "message_end",
      }),
    ]);
  } finally {
    harness.restore();
  }

  const [messageRecord] = Array.from(harness.sessionMessageRecords.values());
  assert.ok(messageRecord);
  const messageContentRecords = harness.messageContentRecordsByMessageId.get(messageRecord.id);
  assert.deepEqual(
    messageContentRecords?.map((record) => {
      return {
        text: record.text,
        type: record.type,
      };
    }),
    [
      {
        text: "READY",
        type: "text",
      },
    ],
  );
});

test("PiMonoSessionEventHandler error logs unhandled message roles", async () => {
  const harness = PiMonoSessionEventHandlerTestHarness.create();
  const handler = new PiMonoSessionEventHandler(
    harness.transactionProvider as never,
    "session-1",
    harness.redisService as never,
  );

  try {
    await handler.handle({
      message: {
        role: "custom",
      },
      type: "message_end",
    });
  } finally {
    harness.restore();
  }

  assert.equal(harness.sessionMessageRecords.size, 0);
  assert.equal(harness.infoLogs.length, 0);
  assert.equal(harness.errorLogs.length, 1);
  assert.deepEqual(
    (harness.errorLogs[0] as unknown[])[0],
    {
      event: {
        message: {
          role: "custom",
        },
        type: "message_end",
      },
      logMessage: "unhandled pi mono message_end event",
      sessionId: "session-1",
    },
  );
});
