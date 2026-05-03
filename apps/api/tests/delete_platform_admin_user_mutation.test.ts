import assert from "node:assert/strict";
import { test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { DeletePlatformAdminUserMutation } from "../src/graphql/mutations/delete_platform_admin_user.ts";
import { PlatformAdminUserDeletionService } from "../src/services/platform_admin_user_deletion_service.ts";

type SqlMockInput = {
  blockerRows?: Array<{ label: string; totalCount: number }>;
  membershipRows?: Array<{ companyId: string }>;
};

type SqlMock = {
  calls: string[];
  sql: (<T>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>) & {
    begin(callback: (transaction: SqlMock["sql"]) => Promise<void>): Promise<void>;
  };
  transactionCalls: string[];
};

class DeletePlatformAdminUserMutationTestHarness {
  static createConfig(): Config {
    return {
      auth: {
        clerk: {
          authorized_parties: ["http://localhost"],
          jwks_url: "http://localhost/.well-known/jwks.json",
          publishable_key: "pk_test_local",
          secret_key: "sk_test_local",
        },
        provider: "clerk",
      },
    } as Config;
  }

  static createContext(isPlatformAdmin: boolean): GraphqlRequestContext {
    return {
      app_runtime_transaction_provider: null,
      authSession: {
        token: "jwt-token",
        user: {
          email: "admin@example.com",
          firstName: "Admin",
          id: "admin-user",
          lastName: "User",
          provider: "clerk",
          providerSubject: "user_clerk_admin",
        },
      },
      isPlatformAdmin,
      resolveSubscriptionContext: null,
    };
  }

  static createSqlMock(input: SqlMockInput = {}): SqlMock {
    const calls: string[] = [];
    const transactionCalls: string[] = [];
    const sql = (async <T>(strings: TemplateStringsArray): Promise<T> => {
      const query = strings.join("?").replace(/\s+/g, " ").trim();
      calls.push(query);
      if (query.includes("FROM users")) {
        return [{
          clerkUserId: "user_clerk_target",
          email: "target@example.com",
          id: "target-user",
        }] as T;
      }
      if (query.includes("FROM company_secrets")) {
        return (input.blockerRows ?? [{
          label: "company secrets",
          totalCount: 0,
        }, {
          label: "inbox answers",
          totalCount: 0,
        }]) as T;
      }
      if (query.includes("FROM company_members")) {
        return (input.membershipRows ?? [{
          companyId: "company-1",
        }, {
          companyId: "company-2",
        }]) as T;
      }

      return [] as T;
    }) as SqlMock["sql"];
    sql.begin = async (callback) => {
      const transaction = (async <T>(strings: TemplateStringsArray): Promise<T> => {
        const query = strings.join("?").replace(/\s+/g, " ").trim();
        transactionCalls.push(query);
        return [] as T;
      }) as SqlMock["sql"];
      transaction.begin = sql.begin;
      await callback(transaction);
    };

    return {
      calls,
      sql,
      transactionCalls,
    };
  }

  static createService(input: {
    clerkDeleteUser: (userId: string) => Promise<unknown>;
    sqlMock: SqlMock;
  }): PlatformAdminUserDeletionService {
    return PlatformAdminUserDeletionService.createForTest(
      DeletePlatformAdminUserMutationTestHarness.createConfig(),
      {
        getSqlClient() {
          return input.sqlMock.sql;
        },
      } as never,
      {
        users: {
          deleteUser: input.clerkDeleteUser,
        },
      },
    );
  }
}

test("PlatformAdminUserDeletionService deletes Clerk and local user records", async () => {
  const sqlMock = DeletePlatformAdminUserMutationTestHarness.createSqlMock();
  const clerkDeleteUser = vi.fn(async () => ({}));
  const service = DeletePlatformAdminUserMutationTestHarness.createService({
    clerkDeleteUser,
    sqlMock,
  });

  const result = await service.deleteUser({
    confirmationEmail: "target@example.com",
    requestingUserId: "admin-user",
    userId: "target-user",
  });

  assert.deepEqual(result, {
    clerkUserId: "user_clerk_target",
    email: "target@example.com",
    id: "target-user",
    membershipCount: 2,
  });
  assert.deepEqual(clerkDeleteUser.mock.calls, [["user_clerk_target"]]);
  assert.equal(sqlMock.transactionCalls.some((query) => query.startsWith("UPDATE tasks")), true);
  assert.equal(sqlMock.transactionCalls.some((query) => query.startsWith("DELETE FROM company_members")), true);
  assert.equal(sqlMock.transactionCalls.some((query) => query.startsWith("DELETE FROM platform_admins")), true);
  assert.equal(sqlMock.transactionCalls.some((query) => query.startsWith("DELETE FROM users")), true);
});

test("PlatformAdminUserDeletionService rejects users with restricted references before Clerk deletion", async () => {
  const sqlMock = DeletePlatformAdminUserMutationTestHarness.createSqlMock({
    blockerRows: [{
      label: "company secrets",
      totalCount: 1,
    }],
  });
  const clerkDeleteUser = vi.fn(async () => ({}));
  const service = DeletePlatformAdminUserMutationTestHarness.createService({
    clerkDeleteUser,
    sqlMock,
  });

  await assert.rejects(
    () => service.deleteUser({
      confirmationEmail: "target@example.com",
      requestingUserId: "admin-user",
      userId: "target-user",
    }),
    /User cannot be deleted while referenced by company secrets\./,
  );
  assert.equal(clerkDeleteUser.mock.calls.length, 0);
  assert.equal(sqlMock.transactionCalls.length, 0);
});

test("DeletePlatformAdminUserMutation requires platform admin access", async () => {
  const deleteUser = vi.fn(async () => ({
    clerkUserId: "user_clerk_target",
    email: "target@example.com",
    id: "target-user",
    membershipCount: 0,
  }));
  const mutation = new DeletePlatformAdminUserMutation({
    deleteUser,
  } as never);

  await assert.rejects(
    () => mutation.execute(
      null,
      {
        input: {
          confirmationEmail: "target@example.com",
          userId: "target-user",
        },
      },
      DeletePlatformAdminUserMutationTestHarness.createContext(false),
    ),
    /Platform admin access required\./,
  );
  assert.equal(deleteUser.mock.calls.length, 0);
});
