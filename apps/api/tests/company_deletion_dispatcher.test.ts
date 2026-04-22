import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { CompanyDeletionDispatcher } from "../src/services/company_deletions/dispatcher.ts";
import type { CompanyDeletionRequestRecord } from "../src/services/company_deletions/request_service.ts";

/**
 * Supplies reusable request rows for dispatcher tests without depending on a live Postgres table.
 */
class CompanyDeletionDispatcherTestHarness {
  static createRequest(
    id: string,
    status: CompanyDeletionRequestRecord["status"] = "requested",
  ): CompanyDeletionRequestRecord {
    const now = new Date("2026-04-22T12:00:00.000Z");
    return {
      attempts: 0,
      clerkOrganizationId: "org_1",
      companyId: "company-1",
      companyName: "Acme",
      completedAt: status === "completed" ? now : null,
      id,
      lastError: null,
      lockedAt: null,
      lockedBy: null,
      nextAttemptAt: null,
      requestedAt: now,
      requestedByUserId: "user-1",
      startedAt: null,
      status,
      updatedAt: now,
    };
  }

  static createLogger() {
    return {
      child() {
        return {
          info: vi.fn(),
        };
      },
    };
  }
}

test("CompanyDeletionDispatcher uses the same queue enqueue path for due sweep requests", async () => {
  const enqueueRequest = vi.fn(async () => {});
  const listDispatchableRequests = vi.fn(async () => [
    CompanyDeletionDispatcherTestHarness.createRequest("request-1"),
    CompanyDeletionDispatcherTestHarness.createRequest("request-2"),
  ]);
  const dispatcher = new CompanyDeletionDispatcher(
    {} as never,
    {
      enqueueRequest,
    } as never,
    {
      listDispatchableRequests,
    } as never,
    CompanyDeletionDispatcherTestHarness.createLogger() as never,
  );

  const dispatchedCount = await dispatcher.dispatchDueRequests(25);
  const listDispatchableRequestsCalls = listDispatchableRequests.mock.calls as unknown as Array<[unknown, number]>;

  assert.equal(dispatchedCount, 2);
  assert.deepEqual(listDispatchableRequestsCalls[0]?.[1], 25);
  assert.deepEqual(enqueueRequest.mock.calls, [["request-1"], ["request-2"]]);
});

test("CompanyDeletionDispatcher skips direct dispatch for completed requests", async () => {
  const enqueueRequest = vi.fn(async () => {});
  const loadRequestById = vi.fn(async () => CompanyDeletionDispatcherTestHarness.createRequest("request-1", "completed"));
  const dispatcher = new CompanyDeletionDispatcher(
    {} as never,
    {
      enqueueRequest,
    } as never,
    {
      loadRequestById,
    } as never,
    CompanyDeletionDispatcherTestHarness.createLogger() as never,
  );

  await dispatcher.dispatchRequest("request-1");
  const loadRequestByIdCalls = loadRequestById.mock.calls as unknown as Array<[unknown, string]>;

  assert.deepEqual(loadRequestByIdCalls[0]?.[1], "request-1");
  assert.equal(enqueueRequest.mock.calls.length, 0);
});
