import assert from "node:assert/strict";
import { test } from "vitest";
import { DeleteSessionQueuedMessageMutation } from "../src/graphql/mutations/delete_session_queued_message.ts";

test("DeleteSessionQueuedMessageMutation deletes one queued row and serializes the response", async () => {
  const mutation = new DeleteSessionQueuedMessageMutation(
    undefined,
    {
      async deleteQueuedMessage(transactionProvider: unknown, companyId: string, queuedMessageId: string) {
        assert.ok(transactionProvider);
        assert.equal(companyId, "company-1");
        assert.equal(queuedMessageId, "queued-1");

        return {
          createdAt: new Date("2026-03-31T08:00:00.000Z"),
          id: "queued-1",
          images: [],
          sessionId: "session-1",
          shouldSteer: false,
          status: "pending",
          text: "Use the pending queue entry that just got removed.",
          updatedAt: new Date("2026-03-31T08:01:00.000Z"),
        };
      },
    } as never,
  );

  const result = await mutation.execute(
    {},
    {
      input: {
        id: "queued-1",
      },
    },
    {
      authSession: {
        company: {
          id: "company-1",
        },
      },
      app_runtime_transaction_provider: {
        transaction() {
          throw new Error("The mutation stub should receive the transaction provider directly.");
        },
      },
    } as never,
  );

  assert.deepEqual(result, {
    createdAt: "2026-03-31T08:00:00.000Z",
    id: "queued-1",
    sessionId: "session-1",
    shouldSteer: false,
    status: "pending",
    text: "Use the pending queue entry that just got removed.",
    updatedAt: "2026-03-31T08:01:00.000Z",
  });
});
