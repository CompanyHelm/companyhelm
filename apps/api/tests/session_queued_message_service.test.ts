import assert from "node:assert/strict";
import { test } from "vitest";
import { sessionQueuedMessageContents, sessionQueuedMessages } from "../src/db/schema.ts";
import { SessionQueuedMessageService } from "../src/services/agent/session/process/queued_messages.ts";

type QueuedMessageRecord = Record<string, unknown> & {
  claimedAt: Date | null;
  companyId: string;
  createdAt: Date;
  dispatchedAt: Date | null;
  id: string;
  sessionId: string;
  shouldSteer: boolean;
  status: string;
  updatedAt: Date;
};

type QueuedContentRecord = Record<string, unknown> & {
  arguments: unknown | null;
  companyId: string;
  createdAt: Date;
  data: string | null;
  id: string;
  mimeType: string | null;
  sessionQueuedMessageId: string;
  structuredContent: unknown | null;
  text: string | null;
  toolCallId: string | null;
  toolName: string | null;
  type: string;
  updatedAt: Date;
};

type SqlChunk = {
  encoder?: unknown;
  queryChunks?: unknown[];
  value?: unknown;
};

function isQueuedMessageStatus(value: string): value is "pending" | "processing" {
  return value === "pending" || value === "processing";
}

function collectSqlParamValues(chunk: unknown): unknown[] {
  if (Array.isArray(chunk)) {
    return chunk.flatMap((nestedChunk) => collectSqlParamValues(nestedChunk));
  }
  if (!chunk || typeof chunk !== "object") {
    return [];
  }

  const sqlChunk = chunk as SqlChunk;
  if ("encoder" in sqlChunk && "value" in sqlChunk) {
    return [sqlChunk.value];
  }
  if (Array.isArray(sqlChunk.queryChunks)) {
    return sqlChunk.queryChunks.flatMap((nestedChunk) => collectSqlParamValues(nestedChunk));
  }
  if (Array.isArray(sqlChunk.value)) {
    return sqlChunk.value.flatMap((nestedChunk) => collectSqlParamValues(nestedChunk));
  }

  return [];
}

function parseQueuedMessageFilter(condition: unknown): {
  companyId: string | null;
  ids: string[];
  sessionId: string | null;
  statuses: Array<"pending" | "processing">;
} {
  const [companyIdValue, ...restValues] = collectSqlParamValues(condition) as string[];
  const statuses = restValues.filter((value): value is "pending" | "processing" => isQueuedMessageStatus(value));
  const keyFilters = restValues.filter((value) => !isQueuedMessageStatus(value));

  return {
    companyId: companyIdValue ?? null,
    ids: keyFilters.length > 1 ? keyFilters : [],
    sessionId: keyFilters.length === 1 ? keyFilters[0] ?? null : null,
    statuses,
  };
}

class SessionQueuedMessageServiceTestHarness {
  static create() {
    const queuedMessages: QueuedMessageRecord[] = [];
    const queuedContents: QueuedContentRecord[] = [];

    return {
      queuedContents,
      queuedMessages,
      transactionProvider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
          return callback({
            insert(table: unknown) {
              return {
                async values(value: Record<string, unknown> | Array<Record<string, unknown>>) {
                  if (table === sessionQueuedMessages) {
                    const values = Array.isArray(value) ? value as QueuedMessageRecord[] : [value as QueuedMessageRecord];
                    queuedMessages.push(...values);
                    return undefined;
                  }

                  if (table === sessionQueuedMessageContents) {
                    const values = Array.isArray(value) ? value as QueuedContentRecord[] : [value as QueuedContentRecord];
                    queuedContents.push(...values);
                    return undefined;
                  }

                  throw new Error("Unexpected insert table.");
                },
              };
            },
            select() {
              return {
                from(table: unknown) {
                  if (table === sessionQueuedMessages) {
                    return {
                      async where(condition: unknown) {
                        const filter = parseQueuedMessageFilter(condition);
                        return queuedMessages.filter((queuedMessage) => {
                          const matchesCompanyId = !filter.companyId || queuedMessage.companyId === filter.companyId;
                          const matchesId = filter.ids.length === 0 || filter.ids.includes(queuedMessage.id);
                          const matchesSessionId = !filter.sessionId
                            || queuedMessage.sessionId === filter.sessionId
                            || queuedMessage.id === filter.sessionId;
                          if (!matchesCompanyId || !matchesId || !matchesSessionId) {
                            return false;
                          }
                          if (filter.statuses.length > 0) {
                            if (!isQueuedMessageStatus(queuedMessage.status) || !filter.statuses.includes(queuedMessage.status)) {
                              return false;
                            }
                          }

                          return true;
                        });
                      },
                    };
                  }

                  if (table === sessionQueuedMessageContents) {
                    return {
                      async where(condition: unknown) {
                        const [companyId, ...queuedMessageIds] = collectSqlParamValues(condition) as string[];
                        return queuedContents.filter((queuedContent) => {
                          if (companyId && queuedContent.companyId !== companyId) {
                            return false;
                          }
                          if (queuedMessageIds.length > 0 && !queuedMessageIds.includes(queuedContent.sessionQueuedMessageId)) {
                            return false;
                          }

                          return true;
                        });
                      },
                    };
                  }

                  throw new Error("Unexpected select table.");
                },
              };
            },
            update(table: unknown) {
              if (table !== sessionQueuedMessages) {
                throw new Error("Unexpected update table.");
              }

              return {
                set(value: Record<string, unknown>) {
                  return {
                    async where(condition: unknown) {
                      const filter = parseQueuedMessageFilter(condition);
                      for (const queuedMessage of queuedMessages) {
                        const matchesCompanyId = !filter.companyId || queuedMessage.companyId === filter.companyId;
                        const matchesId = filter.ids.length === 0 || filter.ids.includes(queuedMessage.id);
                        const matchesSessionId = !filter.sessionId || queuedMessage.sessionId === filter.sessionId || queuedMessage.id === filter.sessionId;
                        if (matchesCompanyId && matchesId && matchesSessionId) {
                          Object.assign(queuedMessage, value);
                        }
                      }
                    },
                  };
                },
              };
            },
            delete(table: unknown) {
              if (table !== sessionQueuedMessages) {
                throw new Error("Unexpected delete table.");
              }

              return {
                async where(condition: unknown) {
                  const filter = parseQueuedMessageFilter(condition);
                  for (let messageIndex = queuedMessages.length - 1; messageIndex >= 0; messageIndex -= 1) {
                    const queuedMessage = queuedMessages[messageIndex];
                    if (!queuedMessage) {
                      continue;
                    }

                    const matchesCompanyId = !filter.companyId || queuedMessage.companyId === filter.companyId;
                    const matchesId = filter.ids.length === 0 || filter.ids.includes(queuedMessage.id);
                    const matchesSessionId = !filter.sessionId || queuedMessage.sessionId === filter.sessionId || queuedMessage.id === filter.sessionId;
                    if (!matchesCompanyId || !matchesId || !matchesSessionId) {
                      continue;
                    }

                    queuedMessages.splice(messageIndex, 1);
                    for (let index = queuedContents.length - 1; index >= 0; index -= 1) {
                      if (queuedContents[index]?.sessionQueuedMessageId === queuedMessage.id) {
                        queuedContents.splice(index, 1);
                      }
                    }
                  }
                },
              };
            },
          });
        },
      },
    };
  }
}

test("SessionQueuedMessageService batches onto the latest pending row with the same steer mode", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();

  const first = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: "First message",
  });
  const second = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: "Second message",
  });
  await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    images: [{
      base64EncodedImage: "base64-image",
      mimeType: "image/png",
    }],
    sessionId: "session-1",
    shouldSteer: true,
    text: "Steer message",
  });

  harness.queuedMessages[0]!.createdAt = new Date("2026-03-26T20:00:00.000Z");
  harness.queuedMessages[1]!.createdAt = new Date("2026-03-26T20:01:00.000Z");

  const queuedMessages = await service.listQueued(harness.transactionProvider as never, "company-1", "session-1");
  const steerMessages = await service.listPendingSteer(harness.transactionProvider as never, "company-1", "session-1");

  assert.equal(first.id.length > 0, true);
  assert.equal(second.id, first.id);
  assert.equal(queuedMessages.length, 2);
  assert.equal(queuedMessages[0]?.text, "First message\n\nSecond message");
  assert.equal(queuedMessages[1]?.shouldSteer, true);
  assert.equal(queuedMessages[1]?.images.length, 1);
  assert.equal(queuedMessages[1]?.images[0]?.mimeType, "image/png");
  assert.equal(steerMessages.length, 1);
  assert.equal(steerMessages[0]?.text, "Steer message");
});

test("SessionQueuedMessageService starts a new row once the latest queue entry is no longer pending", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();

  const first = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: "Queued prompt",
  });
  await service.markProcessing(harness.transactionProvider as never, "company-1", [first.id]);
  const second = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: "Follow-up prompt",
  });

  assert.notEqual(second.id, first.id);
  assert.equal(harness.queuedMessages.length, 2);
  assert.equal(harness.queuedMessages[0]?.status, "processing");
  assert.equal(harness.queuedMessages[1]?.status, "pending");
});

test("SessionQueuedMessageService stores text and image parts in queued contents", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();

  await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    images: [{
      base64EncodedImage: "encoded-image",
      mimeType: "image/png",
    }],
    sessionId: "session-1",
    shouldSteer: false,
    text: "Queued prompt",
  });

  assert.equal(harness.queuedMessages.length, 1);
  assert.equal(harness.queuedContents.length, 2);
  assert.equal(harness.queuedContents[0]?.type, "text");
  assert.equal(harness.queuedContents[0]?.text, "Queued prompt");
  assert.equal(harness.queuedContents[1]?.type, "image");
  assert.equal(harness.queuedContents[1]?.data, "encoded-image");
  assert.equal(harness.queuedContents[1]?.mimeType, "image/png");
});

test("SessionQueuedMessageService marks queued rows processing, records claim and dispatch timestamps, and deletes processed rows", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();
  const first = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    images: [{
      base64EncodedImage: "image-1",
      mimeType: "image/png",
    }],
    sessionId: "session-1",
    shouldSteer: false,
    text: "Queued prompt",
  });

  await service.markProcessing(harness.transactionProvider as never, "company-1", [first.id]);
  assert.equal(harness.queuedMessages[0]?.status, "processing");
  assert.ok(harness.queuedMessages[0]?.claimedAt instanceof Date);
  assert.equal(harness.queuedMessages[0]?.dispatchedAt, null);
  assert.ok(harness.queuedMessages[0]?.updatedAt instanceof Date);

  const dispatchedAt = new Date("2026-03-26T12:01:00.000Z");
  await service.markDispatched(harness.transactionProvider as never, "company-1", [first.id], dispatchedAt);
  assert.equal((harness.queuedMessages[0]?.dispatchedAt as Date | null)?.toISOString(), dispatchedAt.toISOString());

  await service.deleteProcessed(harness.transactionProvider as never, "company-1", [first.id]);

  assert.equal(harness.queuedMessages.length, 0);
  assert.equal(harness.queuedContents.length, 0);
});

test("SessionQueuedMessageService does not expose in-flight processing rows as processable work", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();
  const queuedMessage = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: "Only the worker that already claimed this row may continue it.",
  });

  await service.markProcessing(harness.transactionProvider as never, "company-1", [queuedMessage.id]);

  const processableMessages = await service.listProcessable(
    harness.transactionProvider as never,
    "company-1",
    "session-1",
  );

  assert.deepEqual(processableMessages, []);
  assert.equal(await service.hasPendingMessages(harness.transactionProvider as never, "company-1", "session-1"), false);
});

test("SessionQueuedMessageService resets claim metadata when a claimed row returns to pending", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();
  const queuedMessage = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: "Retry this after the runtime error.",
  });

  await service.markProcessing(harness.transactionProvider as never, "company-1", [queuedMessage.id]);
  await service.markDispatched(
    harness.transactionProvider as never,
    "company-1",
    [queuedMessage.id],
    new Date("2026-03-26T12:05:00.000Z"),
  );
  await service.markPending(harness.transactionProvider as never, "company-1", [queuedMessage.id]);

  assert.equal(harness.queuedMessages[0]?.status, "pending");
  assert.equal(harness.queuedMessages[0]?.claimedAt, null);
  assert.equal(harness.queuedMessages[0]?.dispatchedAt, null);
});

test("SessionQueuedMessageService reports whether a session still has pending rows", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();

  assert.equal(await service.hasPendingMessages(harness.transactionProvider as never, "company-1", "session-1"), false);

  await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: "Queued prompt",
  });

  assert.equal(await service.hasPendingMessages(harness.transactionProvider as never, "company-1", "session-1"), true);
});

test("SessionQueuedMessageService marks one pending queued row as steer", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();

  const queuedMessage = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: "Please narrow the response to migration failures.",
  });

  const steeredMessage = await service.markSteer(
    harness.transactionProvider as never,
    "company-1",
    queuedMessage.id,
  );

  assert.equal(steeredMessage.id, queuedMessage.id);
  assert.equal(steeredMessage.shouldSteer, true);
  assert.equal(harness.queuedMessages[0]?.shouldSteer, true);
  assert.ok(harness.queuedMessages[0]?.updatedAt instanceof Date);
});

test("SessionQueuedMessageService deletes one pending non-steer queued row", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();

  const queuedMessage = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: "Use the lighter reproduction case while the worker is still queued.",
  });

  const deletedQueuedMessage = await service.deletePendingUserMessage(
    harness.transactionProvider as never,
    "company-1",
    queuedMessage.id,
  );

  assert.equal(deletedQueuedMessage.id, queuedMessage.id);
  assert.equal(deletedQueuedMessage.shouldSteer, false);
  assert.equal(harness.queuedMessages.length, 0);
});

test("SessionQueuedMessageService rejects deleting steer queued rows", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();

  const queuedMessage = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: true,
    text: "Escalate this to a steer message instead of deleting it.",
  });

  await assert.rejects(
    () => service.deletePendingUserMessage(
      harness.transactionProvider as never,
      "company-1",
      queuedMessage.id,
    ),
    /Steer queued messages cannot be deleted\./u,
  );

  assert.equal(harness.queuedMessages.length, 1);
});
