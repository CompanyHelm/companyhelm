import assert from "node:assert/strict";
import { test } from "vitest";
import { sessionQueuedMessageImages, sessionQueuedMessages } from "../src/db/schema.ts";
import { SessionQueuedMessageService } from "../src/services/agent/session/process/queued_messages.ts";

type QueuedMessageRecord = Record<string, unknown> & {
  companyId: string;
  createdAt: Date;
  id: string;
  sessionId: string;
  shouldSteer: boolean;
  status: string;
  text: string;
  updatedAt: Date;
};

type QueuedImageRecord = Record<string, unknown> & {
  base64EncodedImage: string;
  companyId: string;
  createdAt: Date;
  id: string;
  mimeType: string;
  sessionQueuedMessageId: string;
  updatedAt: Date;
};

class SessionQueuedMessageServiceTestHarness {
  static create() {
    const queuedMessages: QueuedMessageRecord[] = [];
    const queuedImages: QueuedImageRecord[] = [];

    return {
      queuedImages,
      queuedMessages,
      transactionProvider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
          return callback({
            insert(table: unknown) {
              return {
                async values(value: Record<string, unknown> | Array<Record<string, unknown>>) {
                  if (table === sessionQueuedMessages) {
                    queuedMessages.push(value as QueuedMessageRecord);
                    return undefined;
                  }

                  if (table === sessionQueuedMessageImages) {
                    const values = Array.isArray(value) ? value as QueuedImageRecord[] : [value as QueuedImageRecord];
                    queuedImages.push(...values);
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
                      async where() {
                        return queuedMessages;
                      },
                    };
                  }

                  if (table === sessionQueuedMessageImages) {
                    return {
                      async where() {
                        return queuedImages;
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
                    async where() {
                      for (const queuedMessage of queuedMessages) {
                        if (queuedMessage.status === "pending") {
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
                async where() {
                  while (queuedMessages.length > 0) {
                    const deletedMessage = queuedMessages.pop();
                    if (!deletedMessage) {
                      continue;
                    }

                    for (let index = queuedImages.length - 1; index >= 0; index -= 1) {
                      if (queuedImages[index]?.sessionQueuedMessageId === deletedMessage.id) {
                        queuedImages.splice(index, 1);
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

test("SessionQueuedMessageService enqueues queued messages and loads them in created order", async () => {
  const harness = SessionQueuedMessageServiceTestHarness.create();
  const service = new SessionQueuedMessageService();

  const first = await service.enqueue(harness.transactionProvider as never, {
    companyId: "company-1",
    sessionId: "session-1",
    shouldSteer: false,
    text: "First message",
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

  const queuedMessages = await service.listPending(harness.transactionProvider as never, "company-1", "session-1");
  const steerMessages = await service.listPendingSteer(harness.transactionProvider as never, "company-1", "session-1");

  assert.equal(first.id.length > 0, true);
  assert.equal(queuedMessages.length, 2);
  assert.equal(queuedMessages[0]?.text, "First message");
  assert.equal(queuedMessages[1]?.shouldSteer, true);
  assert.equal(queuedMessages[1]?.images.length, 1);
  assert.equal(queuedMessages[1]?.images[0]?.mimeType, "image/png");
  assert.equal(steerMessages.length, 1);
  assert.equal(steerMessages[0]?.text, "Steer message");
});

test("SessionQueuedMessageService marks queued rows processing and deletes processed rows", async () => {
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
  assert.ok(harness.queuedMessages[0]?.updatedAt instanceof Date);

  await service.deleteProcessed(harness.transactionProvider as never, "company-1", [first.id]);

  assert.equal(harness.queuedMessages.length, 0);
  assert.equal(harness.queuedImages.length, 0);
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
