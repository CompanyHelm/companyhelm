import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { TriggerRoutineMutation } from "../src/graphql/mutations/trigger_routine.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";

function createContext(): GraphqlRequestContext {
  return {
    app_runtime_transaction_provider: {} as never,
    authSession: {
      company: {
        id: "company-1",
        name: "Company",
      },
      token: "token",
      user: {
        email: "user@example.com",
        firstName: "User",
        id: "user-1",
        lastName: null,
        provider: "clerk",
        providerSubject: "subject-1",
      },
    },
  };
}

test("TriggerRoutineMutation executes a manual routine run in the authenticated company", async () => {
  const execute = vi.fn(async () => ({
    bullmqJobId: null,
    createdAt: new Date("2026-04-17T16:00:00.000Z"),
    errorMessage: null,
    finishedAt: null,
    id: "run-1",
    routineId: "routine-1",
    sessionId: "session-1",
    source: "manual" as const,
    startedAt: new Date("2026-04-17T16:00:00.000Z"),
    status: "prompt_queued" as const,
    triggerId: null,
    updatedAt: new Date("2026-04-17T16:00:01.000Z"),
  }));
  const mutation = new TriggerRoutineMutation({
    execute,
  } as never);

  const result = await mutation.execute(null, {
    input: {
      id: "routine-1",
    },
  }, createContext());

  const executeCalls = execute.mock.calls as unknown[][];
  assert.deepEqual(executeCalls[0]?.[1], {
    companyId: "company-1",
    routineId: "routine-1",
    source: "manual",
    triggerId: null,
  });
  assert.deepEqual(result, {
    bullmqJobId: null,
    createdAt: "2026-04-17T16:00:00.000Z",
    errorMessage: null,
    finishedAt: null,
    id: "run-1",
    routineId: "routine-1",
    sessionId: "session-1",
    source: "manual",
    startedAt: "2026-04-17T16:00:00.000Z",
    status: "prompt_queued",
    triggerId: null,
    updatedAt: "2026-04-17T16:00:01.000Z",
  });
});

test("TriggerRoutineMutation requires authenticated company context", async () => {
  const mutation = new TriggerRoutineMutation({
    async execute() {
      throw new Error("should not execute");
    },
  } as never);

  await assert.rejects(
    mutation.execute(null, {
      input: {
        id: "routine-1",
      },
    }, {
      app_runtime_transaction_provider: null,
      authSession: null,
    }),
    /Authentication required/,
  );
});
