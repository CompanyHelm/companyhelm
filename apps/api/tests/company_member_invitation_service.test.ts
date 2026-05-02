import assert from "node:assert/strict";
import { test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { InviteCompanyMemberMutation } from "../src/graphql/mutations/invite_company_member.ts";
import { RemoveCompanyMemberMutation } from "../src/graphql/mutations/remove_company_member.ts";
import { UpdateCompanyMemberRoleMutation } from "../src/graphql/mutations/update_company_member_role.ts";
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

  static createMemberRemovalTransactionProvider(input: {
    anotherAdminUserId: string | null;
    clerkOrganizationId: string | null;
    member: {
      clerkInvitationId: string | null;
      clerkUserId: string | null;
      createdAt: Date;
      emailAddress: string;
      firstName: string;
      lastName: string | null;
      role: "admin" | "member";
      status: "active" | "invited";
      updatedAt: Date;
      userId: string;
    } | null;
  }) {
    const deleteCalls: Array<{ table: unknown }> = [];
    const updateCalls: Array<{ table: unknown; values: Record<string, unknown> }> = [];
    const provider = {
      transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) => {
        return callback({
          delete(table: unknown) {
            return {
              async where() {
                deleteCalls.push({ table });
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
                          return [{ clerkOrganizationId: input.clerkOrganizationId }];
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
                              return input.member ? [input.member] : [];
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
                        return input.anotherAdminUserId ? [{ userId: input.anotherAdminUserId }] : [];
                      },
                    };
                  },
                };
              },
            };
          },
          update(table: unknown) {
            return {
              set(values: Record<string, unknown>) {
                return {
                  async where() {
                    updateCalls.push({ table, values });
                  },
                };
              },
            };
          },
        });
      }),
    };

    return {
      deleteCalls,
      provider,
      updateCalls,
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
        deleteOrganizationMembership: vi.fn(async () => ({})),
        revokeOrganizationInvitation: vi.fn(async () => ({
          createdAt: Date.parse("2026-04-29T12:00:00.000Z"),
          emailAddress: "teammate@example.com",
          id: "invitation-1",
          status: "revoked",
        })),
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
    id: "CompanyMemberInvitation:company-1:user-invited-1",
    role: "member",
    status: "invited",
    userId: "user-invited-1",
  });
});

test("CompanyMemberInvitationService removes active members from Clerk and open task assignment", async () => {
  const deleteOrganizationMembership = vi.fn(async () => ({}));
  const service = CompanyMemberInvitationService.createForTest(
    CompanyMemberInvitationServiceTestHarness.createConfig(),
    {
      organizations: {
        createOrganizationInvitation: vi.fn(async () => ({
          createdAt: Date.parse("2026-04-29T12:00:00.000Z"),
          emailAddress: "teammate@example.com",
          id: "invitation-1",
          status: "pending",
        })),
        deleteOrganizationMembership,
        revokeOrganizationInvitation: vi.fn(async () => ({
          createdAt: Date.parse("2026-04-29T12:00:00.000Z"),
          emailAddress: "teammate@example.com",
          id: "invitation-1",
          status: "revoked",
        })),
      },
    },
  );
  const transactionHarness = CompanyMemberInvitationServiceTestHarness.createMemberRemovalTransactionProvider({
    anotherAdminUserId: "admin-1",
    clerkOrganizationId: "org_clerk_1",
    member: {
      clerkInvitationId: null,
      clerkUserId: "user_clerk_2",
      createdAt: new Date("2026-04-29T12:00:00.000Z"),
      emailAddress: "teammate@example.com",
      firstName: "Grace",
      lastName: "Hopper",
      role: "member",
      status: "active",
      updatedAt: new Date("2026-04-30T12:00:00.000Z"),
      userId: "user-2",
    },
  });

  const result = await service.removeMember({
    companyId: "company-1",
    transactionProvider: transactionHarness.provider as never,
    userId: "user-2",
  });

  assert.deepEqual(deleteOrganizationMembership.mock.calls[0]?.[0], {
    organizationId: "org_clerk_1",
    userId: "user_clerk_2",
  });
  assert.equal(transactionHarness.updateCalls.length, 1);
  assert.equal(transactionHarness.updateCalls[0]?.values.assignedAt, null);
  assert.equal(transactionHarness.updateCalls[0]?.values.assignedUserId, null);
  assert.equal(transactionHarness.deleteCalls.length, 1);
  assert.deepEqual(result, {
    createdAt: "2026-04-29T12:00:00.000Z",
    emailAddress: "teammate@example.com",
    id: "CompanyMemberAccess:company-1:user-2",
    name: "Grace Hopper",
    role: "member",
    status: "active",
    updatedAt: "2026-04-30T12:00:00.000Z",
    userId: "user-2",
  });
});

test("CompanyMemberInvitationService rejects removing the last active admin", async () => {
  const deleteOrganizationMembership = vi.fn(async () => ({}));
  const service = CompanyMemberInvitationService.createForTest(
    CompanyMemberInvitationServiceTestHarness.createConfig(),
    {
      organizations: {
        createOrganizationInvitation: vi.fn(async () => ({
          createdAt: Date.parse("2026-04-29T12:00:00.000Z"),
          emailAddress: "founder@example.com",
          id: "invitation-1",
          status: "pending",
        })),
        deleteOrganizationMembership,
        revokeOrganizationInvitation: vi.fn(async () => ({
          createdAt: Date.parse("2026-04-29T12:00:00.000Z"),
          emailAddress: "founder@example.com",
          id: "invitation-1",
          status: "revoked",
        })),
      },
    },
  );
  const transactionHarness = CompanyMemberInvitationServiceTestHarness.createMemberRemovalTransactionProvider({
    anotherAdminUserId: null,
    clerkOrganizationId: "org_clerk_1",
    member: {
      clerkInvitationId: null,
      clerkUserId: "user_clerk_1",
      createdAt: new Date("2026-04-29T12:00:00.000Z"),
      emailAddress: "founder@example.com",
      firstName: "Ada",
      lastName: null,
      role: "admin",
      status: "active",
      updatedAt: new Date("2026-04-30T12:00:00.000Z"),
      userId: "user-1",
    },
  });

  await assert.rejects(
    () => service.removeMember({
      companyId: "company-1",
      transactionProvider: transactionHarness.provider as never,
      userId: "user-1",
    }),
    /You cannot remove the last active company admin/u,
  );
  assert.equal(deleteOrganizationMembership.mock.calls.length, 0);
  assert.equal(transactionHarness.deleteCalls.length, 0);
});

test("InviteCompanyMemberMutation invites against the authenticated company context", async () => {
  const inviteMember = vi.fn(async () => ({
    createdAt: "2026-04-29T12:00:00.000Z",
    emailAddress: "teammate@example.com",
    id: "CompanyMemberInvitation:company-1:user-invited-1",
    role: "member",
    status: "invited",
    userId: "user-invited-1",
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

test("UpdateCompanyMemberRoleMutation rejects changes to the current user's own role", async () => {
  const updateMemberRole = vi.fn(async () => ({
    createdAt: "2026-04-29T12:00:00.000Z",
    emailAddress: "founder@example.com",
    id: "CompanyMemberAccess:company-1:user-1",
    name: "Ada",
    role: "member",
    status: "active",
    updatedAt: "2026-04-29T12:00:00.000Z",
    userId: "user-1",
  }));
  const requireActiveAdmin = vi.fn(async () => {});
  const mutation = new UpdateCompanyMemberRoleMutation({
    updateMemberRole,
  } as never, {
    requireActiveAdmin,
  } as never);
  const context = CompanyMemberInvitationServiceTestHarness.createContext();

  await assert.rejects(
    () => mutation.execute(null, {
      input: {
        role: "member",
        userId: "user-1",
      },
    }, context),
    /You cannot change your own company role/u,
  );
  assert.equal(requireActiveAdmin.mock.calls.length, 0);
  assert.equal(updateMemberRole.mock.calls.length, 0);
});

test("RemoveCompanyMemberMutation rejects removing the current user", async () => {
  const removeMember = vi.fn(async () => ({
    createdAt: "2026-04-29T12:00:00.000Z",
    emailAddress: "founder@example.com",
    id: "CompanyMemberAccess:company-1:user-1",
    name: "Ada",
    role: "admin",
    status: "active",
    updatedAt: "2026-04-29T12:00:00.000Z",
    userId: "user-1",
  }));
  const requireActiveAdmin = vi.fn(async () => {});
  const mutation = new RemoveCompanyMemberMutation({
    removeMember,
  } as never, {
    requireActiveAdmin,
  } as never);
  const context = CompanyMemberInvitationServiceTestHarness.createContext();

  await assert.rejects(
    () => mutation.execute(null, {
      input: {
        userId: "user-1",
      },
    }, context),
    /You cannot remove yourself from the company/u,
  );
  assert.equal(requireActiveAdmin.mock.calls.length, 0);
  assert.equal(removeMember.mock.calls.length, 0);
});

test("RemoveCompanyMemberMutation removes members against the authenticated company context", async () => {
  const removeMember = vi.fn(async () => ({
    createdAt: "2026-04-29T12:00:00.000Z",
    emailAddress: "teammate@example.com",
    id: "CompanyMemberAccess:company-1:user-2",
    name: "Grace Hopper",
    role: "member",
    status: "active",
    updatedAt: "2026-04-29T12:00:00.000Z",
    userId: "user-2",
  }));
  const requireActiveAdmin = vi.fn(async () => {});
  const mutation = new RemoveCompanyMemberMutation({
    removeMember,
  } as never, {
    requireActiveAdmin,
  } as never);
  const context = CompanyMemberInvitationServiceTestHarness.createContext();

  await mutation.execute(null, {
    input: {
      userId: "user-2",
    },
  }, context);

  assert.deepEqual(requireActiveAdmin.mock.calls[0], [{
    action: "remove company members",
    companyId: "company-1",
    transactionProvider: context.app_runtime_transaction_provider,
    userId: "user-1",
  }]);
  assert.deepEqual(removeMember.mock.calls[0], [{
    companyId: "company-1",
    transactionProvider: context.app_runtime_transaction_provider,
    userId: "user-2",
  }]);
});
