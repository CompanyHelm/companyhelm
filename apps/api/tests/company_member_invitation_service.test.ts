import assert from "node:assert/strict";
import { test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { InviteCompanyMemberMutation } from "../src/graphql/mutations/invite_company_member.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";
import { CompanyMemberInvitationService } from "../src/services/company_member_invitation_service.ts";

/**
 * Builds focused doubles for the Clerk invitation path so the tests can assert our redirect
 * contract without contacting Clerk or depending on a live database.
 */
class CompanyMemberInvitationServiceTestHarness {
  static createConfig(): Config {
    return {
      auth: {
        clerk: {
          authorized_parties: ["http://localhost:5173"],
          jwks_url: "https://example.com/jwks",
          publishable_key: "pk_test",
          secret_key: "sk_test",
        },
        provider: "clerk",
      },
      webPublicUrl: "https://app.companyhelm.test",
    } as Config;
  }

  static createTransactionProvider(clerkOrganizationId: string | null) {
    return {
      transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) => {
        return callback({
          insert() {
            return {
              values() {
                return {
                  onConflictDoNothing() {
                    return {
                      async returning() {
                        return [{ id: "user-invited-1" }];
                      },
                    };
                  },
                  async onConflictDoUpdate() {},
                };
              },
            };
          },
          select(selection: Record<string, unknown>) {
            return {
              from() {
                if ("clerkOrganizationId" in selection) {
                  return {
                    where() {
                      return {
                        async limit() {
                          return [{ clerkOrganizationId }];
                        },
                      };
                    },
                  };
                }
                if ("clerkInvitationId" in selection) {
                  return {
                    innerJoin() {
                      return {
                        where() {
                          return {
                            async limit() {
                              return [];
                            },
                          };
                        },
                      };
                    },
                  };
                }

                return {
                  where() {
                    return {
                      async limit() {
                        return [];
                      },
                    };
                  },
                };
              },
            };
          },
        });
      }),
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
          provider: "clerk",
          providerSubject: "user_clerk_1",
        },
      },
      resolveSubscriptionContext: null,
    };
  }
}

test("CompanyMemberInvitationService creates Clerk invitations with the configured web redirect", async () => {
  const createOrganizationInvitation = vi.fn(async () => ({
    createdAt: Date.parse("2026-04-29T12:00:00.000Z"),
    emailAddress: "teammate@example.com",
    id: "invitation-1",
    status: "pending",
  }));
  const service = CompanyMemberInvitationService.createForTest(
    CompanyMemberInvitationServiceTestHarness.createConfig(),
    {
      organizations: {
        createOrganizationInvitation,
      },
    },
  );

  const result = await service.inviteMember({
    companyId: "company-1",
    emailAddress: "teammate@example.com",
    inviterUserId: "user_clerk_1",
    role: "member",
    transactionProvider: CompanyMemberInvitationServiceTestHarness.createTransactionProvider("org_clerk_1"),
  });

  assert.deepEqual(createOrganizationInvitation.mock.calls[0]?.[0], {
    emailAddress: "teammate@example.com",
    inviterUserId: "user_clerk_1",
    organizationId: "org_clerk_1",
    redirectUrl: "https://app.companyhelm.test",
    role: "org:admin",
  });
  assert.deepEqual(result, {
    createdAt: "2026-04-29T12:00:00.000Z",
    emailAddress: "teammate@example.com",
    id: "user-invited-1",
    role: "member",
    status: "invited",
  });
});

test("InviteCompanyMemberMutation invites against the authenticated company context", async () => {
  const inviteMember = vi.fn(async () => ({
    createdAt: "2026-04-29T12:00:00.000Z",
    emailAddress: "teammate@example.com",
    id: "user-invited-1",
    role: "member",
    status: "invited",
  }));
  const mutation = new InviteCompanyMemberMutation({
    inviteMember,
  } as never, {
    requireActiveAdmin: vi.fn(async () => {}),
  } as never);
  const context = CompanyMemberInvitationServiceTestHarness.createContext();

  await mutation.execute(null, {
    input: {
      emailAddress: "teammate@example.com",
      role: "member",
    },
  }, context);

  assert.deepEqual(inviteMember.mock.calls[0], [{
    companyId: "company-1",
    emailAddress: "teammate@example.com",
    inviterUserId: "user_clerk_1",
    role: "member",
    transactionProvider: context.app_runtime_transaction_provider,
  }]);
});
