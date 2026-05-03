import assert from "node:assert/strict";
import { test, vi } from "vitest";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { DeletePlatformAdminCompanyMutation } from "../src/graphql/mutations/delete_platform_admin_company.ts";

/**
 * Builds platform-admin contexts and deletion executor doubles for the immediate company deletion
 * mutation so tests can verify authorization and confirmation before destructive cleanup runs.
 */
class DeletePlatformAdminCompanyMutationTestHarness {
  static createContext(isPlatformAdmin: boolean): GraphqlRequestContext {
    return {
      app_runtime_transaction_provider: null,
      isPlatformAdmin,
      authSession: {
        token: "jwt-token",
        user: {
          id: "user-1",
          email: "admin@example.com",
          firstName: "Admin",
          lastName: "User",
          provider: "local",
          providerSubject: "user_local_1",
        },
      },
      resolveSubscriptionContext: null,
    };
  }

  static createCompany() {
    return {
      id: "company-1",
      name: "Acme Operations",
      slug: "acme-operations",
    };
  }
}

test("DeletePlatformAdminCompanyMutation requires platform admin access", async () => {
  const mutation = new DeletePlatformAdminCompanyMutation({
    deleteCompany: vi.fn(),
    loadCompany: vi.fn(),
  } as never);

  await assert.rejects(
    () => mutation.execute(
      null,
      {
        input: {
          companyId: "company-1",
          confirmationName: "Acme Operations",
        },
      },
      DeletePlatformAdminCompanyMutationTestHarness.createContext(false),
    ),
    /Platform admin access required\./,
  );
});

test("DeletePlatformAdminCompanyMutation checks exact company name before deleting", async () => {
  const deleteCompany = vi.fn(async () => DeletePlatformAdminCompanyMutationTestHarness.createCompany());
  const loadCompany = vi.fn(async () => DeletePlatformAdminCompanyMutationTestHarness.createCompany());
  const mutation = new DeletePlatformAdminCompanyMutation({
    deleteCompany,
    loadCompany,
  } as never);

  await assert.rejects(
    () => mutation.execute(
      null,
      {
        input: {
          companyId: "company-1",
          confirmationName: "acme operations",
        },
      },
      DeletePlatformAdminCompanyMutationTestHarness.createContext(true),
    ),
    /Type the company name exactly/u,
  );

  assert.deepEqual(loadCompany.mock.calls[0], ["company-1"]);
  assert.equal(deleteCompany.mock.calls.length, 0);
});

test("DeletePlatformAdminCompanyMutation deletes the confirmed company immediately", async () => {
  const deleteCompany = vi.fn(async () => DeletePlatformAdminCompanyMutationTestHarness.createCompany());
  const loadCompany = vi.fn(async () => DeletePlatformAdminCompanyMutationTestHarness.createCompany());
  const mutation = new DeletePlatformAdminCompanyMutation({
    deleteCompany,
    loadCompany,
  } as never);

  const result = await mutation.execute(
    null,
    {
      input: {
        companyId: "company-1",
        confirmationName: "Acme Operations",
      },
    },
    DeletePlatformAdminCompanyMutationTestHarness.createContext(true),
  );

  assert.deepEqual(loadCompany.mock.calls[0], ["company-1"]);
  assert.deepEqual(deleteCompany.mock.calls[0], [{
    companyId: "company-1",
  }]);
  assert.deepEqual(result, {
    id: "company-1",
    name: "Acme Operations",
  });
});
