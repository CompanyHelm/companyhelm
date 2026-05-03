import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { DeleteCompanyMutation } from "../src/graphql/mutations/delete_company.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import type { CompanyDeletionRequestRecord } from "../src/services/company_deletions/request_service.ts";

/**
 * Builds the authenticated GraphQL context needed by the destructive company deletion mutation.
 */
class DeleteCompanyMutationTestHarness {
  static createPermissionService() {
    return {
      requireActiveAdmin: vi.fn(async () => {}),
    };
  }

  static createContext(): GraphqlRequestContext {
    return {
      app_runtime_transaction_provider: {} as never,
      authSession: {
        company: {
          id: "company-1",
          name: "Acme",
        },
        token: "token",
        user: {
          email: "founder@example.com",
          firstName: "Ada",
          id: "user-1",
          lastName: null,
          provider: "local",
          providerSubject: "user_local_1",
        },
      },
      resolveSubscriptionContext: null,
    };
  }

  static createRequest(): CompanyDeletionRequestRecord {
    const requestedAt = new Date("2026-04-22T12:00:00.000Z");
    return {
      attempts: 0,
      companyId: "company-1",
      companyName: "Acme",
      completedAt: null,
      id: "request-1",
      lastError: null,
      lockedAt: null,
      lockedBy: null,
      nextAttemptAt: null,
      requestedAt,
      requestedByUserId: "user-1",
      startedAt: null,
      status: "requested",
      updatedAt: requestedAt,
    };
  }
}

test("DeleteCompanyMutation requires exact company name confirmation before creating a deletion request", async () => {
  const createDeletionRequest = vi.fn(async () => DeleteCompanyMutationTestHarness.createRequest());
  const dispatchRequest = vi.fn(async () => {});
  const mutation = new DeleteCompanyMutation(
    {
      createDeletionRequest,
    } as never,
    {
      dispatchRequest,
    } as never,
    undefined,
    DeleteCompanyMutationTestHarness.createPermissionService() as never,
  );

  await assert.rejects(
    () => mutation.execute(
      null,
      {
        input: {
          confirmationName: "acme",
        },
      },
      DeleteCompanyMutationTestHarness.createContext(),
    ),
    /Type the company name exactly/u,
  );

  assert.equal(createDeletionRequest.mock.calls.length, 0);
  assert.equal(dispatchRequest.mock.calls.length, 0);
});

test("DeleteCompanyMutation persists the request and dispatches the shared company deletion queue", async () => {
  const createDeletionRequest = vi.fn(async () => DeleteCompanyMutationTestHarness.createRequest());
  const dispatchRequest = vi.fn(async () => {});
  const mutation = new DeleteCompanyMutation(
    {
      createDeletionRequest,
    } as never,
    {
      dispatchRequest,
    } as never,
    undefined,
    DeleteCompanyMutationTestHarness.createPermissionService() as never,
  );

  const result = await mutation.execute(
    null,
    {
      input: {
        confirmationName: "Acme",
      },
    },
    DeleteCompanyMutationTestHarness.createContext(),
  );

  const createDeletionRequestCalls = createDeletionRequest.mock.calls as unknown as Array<[unknown, unknown]>;
  const dispatchRequestCalls = dispatchRequest.mock.calls as unknown as Array<[unknown]>;

  assert.deepEqual(createDeletionRequestCalls[0]?.[1], {
    companyId: "company-1",
    requestedByUserId: "user-1",
  });
  assert.deepEqual(dispatchRequestCalls[0], ["request-1"]);
  assert.deepEqual(result, {
    companyId: "company-1",
    companyName: "Acme",
    completedAt: null,
    id: "request-1",
    lastError: null,
    requestedAt: "2026-04-22T12:00:00.000Z",
    status: "requested",
  });
});

test("DeleteCompanyMutation returns the durable request when immediate dispatch fails", async () => {
  const createDeletionRequest = vi.fn(async () => DeleteCompanyMutationTestHarness.createRequest());
  const dispatchRequest = vi.fn(async () => {
    throw new Error("Redis unavailable");
  });
  const mutation = new DeleteCompanyMutation(
    {
      createDeletionRequest,
    } as never,
    {
      dispatchRequest,
    } as never,
    undefined,
    DeleteCompanyMutationTestHarness.createPermissionService() as never,
  );

  const result = await mutation.execute(
    null,
    {
      input: {
        confirmationName: "Acme",
      },
    },
    DeleteCompanyMutationTestHarness.createContext(),
  );

  assert.equal(result.id, "request-1");
  assert.equal(result.status, "requested");
});
