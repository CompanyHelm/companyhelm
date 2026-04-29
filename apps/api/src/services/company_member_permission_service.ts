import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { companyMembers } from "../db/schema.ts";
import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";

export type CompanyMemberRole = "admin" | "member";
export type CompanyMemberStatus = "active" | "invited";

export type CompanyMemberEntitlements = {
  canDeleteCompany: boolean;
  canInviteMembers: boolean;
  canManageMemberRoles: boolean;
};

export type CompanyMemberPermissionRecord = {
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
};

/**
 * Centralizes CompanyHelm membership permissions so GraphQL presentation and write-side mutation
 * guards derive entitlements from the same active role checks.
 */
@injectable()
export class CompanyMemberPermissionService {
  async getMembership(input: {
    companyId: string;
    transactionProvider: TransactionProviderInterface;
    userId: string;
  }): Promise<CompanyMemberPermissionRecord | null> {
    const [membership] = await input.transactionProvider.transaction(async (transaction) => {
      return transaction
        .select({
          role: companyMembers.role,
          status: companyMembers.status,
        })
        .from(companyMembers)
        .where(and(
          eq(companyMembers.companyId, input.companyId),
          eq(companyMembers.userId, input.userId),
        ))
        .limit(1);
    });

    return membership ?? null;
  }

  async requireActiveAdmin(input: {
    action: string;
    companyId: string;
    transactionProvider: TransactionProviderInterface;
    userId: string;
  }): Promise<void> {
    const membership = await this.getMembership(input);
    if (membership?.status === "active" && membership.role === "admin") {
      return;
    }

    throw new Error(`Only company admins can ${input.action}.`);
  }

  buildEntitlements(membership: CompanyMemberPermissionRecord | null): CompanyMemberEntitlements {
    const isActiveAdmin = membership?.status === "active" && membership.role === "admin";
    return {
      canDeleteCompany: isActiveAdmin,
      canInviteMembers: isActiveAdmin,
      canManageMemberRoles: isActiveAdmin,
    };
  }
}
