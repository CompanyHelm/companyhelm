import { and, asc, eq, ne } from "drizzle-orm";
import { injectable } from "inversify";
import { companyMembers, tasks, users } from "../db/schema.ts";
import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";
import type { CompanyMemberRole, CompanyMemberStatus } from "./company_member_permission_service.ts";

export type CompanyMemberInvitationRecord = {
  createdAt: string;
  emailAddress: string;
  id: string;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  userId: string;
};

export type CompanyMemberAccessRecord = {
  createdAt: string;
  emailAddress: string;
  id: string;
  name: string;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  updatedAt: string;
  userId: string;
};

type CompanyMemberRow = {
  createdAt: Date;
  emailAddress: string;
  firstName: string;
  lastName: string | null;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  updatedAt: Date;
  userId: string;
};

type UserRow = {
  id: string;
};

/**
 * Manages CompanyHelm member rows and keeps local roles authoritative for product permissions.
 */
@injectable()
export class CompanyMemberInvitationService {
  static createForTest(): CompanyMemberInvitationService {
    return new CompanyMemberInvitationService();
  }

  async inviteMember(input: {
    companyId: string;
    emailAddress: string;
    role: CompanyMemberRole;
    transactionProvider: TransactionProviderInterface;
  }): Promise<CompanyMemberInvitationRecord> {
    if (input.emailAddress.length === 0) {
      throw new Error("Email address is required.");
    }

    const user = await this.findOrCreateInvitedUser(input.transactionProvider, input.emailAddress);
    await this.assertCanInviteUser(input.transactionProvider, {
      companyId: input.companyId,
      userId: user.id,
    });

    const now = new Date();
    await input.transactionProvider.transaction(async (transaction) => {
      await transaction
        .insert(companyMembers)
        .values({
          companyId: input.companyId,
          createdAt: now,
          role: input.role,
          status: "invited",
          updatedAt: now,
          userId: user.id,
        })
        .onConflictDoUpdate({
          target: [companyMembers.companyId, companyMembers.userId],
          set: {
            role: input.role,
            status: "invited",
            updatedAt: now,
          },
        });
    });

    return {
      createdAt: now.toISOString(),
      emailAddress: input.emailAddress,
      id: this.createInvitationGraphqlId(input.companyId, user.id),
      role: input.role,
      status: "invited",
      userId: user.id,
    };
  }

  async listMembers(input: {
    companyId: string;
    transactionProvider: TransactionProviderInterface;
  }): Promise<CompanyMemberAccessRecord[]> {
    const rows = await input.transactionProvider.transaction(async (transaction) => {
      return transaction
        .select({
          createdAt: companyMembers.createdAt,
          emailAddress: users.email,
          firstName: users.first_name,
          lastName: users.last_name,
          role: companyMembers.role,
          status: companyMembers.status,
          updatedAt: companyMembers.updatedAt,
          userId: users.id,
        })
        .from(companyMembers)
        .innerJoin(users, eq(companyMembers.userId, users.id))
        .where(eq(companyMembers.companyId, input.companyId))
        .orderBy(asc(users.first_name), asc(users.last_name), asc(users.email)) as Promise<CompanyMemberRow[]>;
    });

    return rows.map((row) => ({
      createdAt: row.createdAt.toISOString(),
      emailAddress: row.emailAddress,
      id: this.createAccessGraphqlId(input.companyId, row.userId),
      name: this.formatMemberName(row),
      role: row.role,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      userId: row.userId,
    }));
  }

  async revokeInvitation(input: {
    companyId: string;
    transactionProvider: TransactionProviderInterface;
    userId: string;
  }): Promise<CompanyMemberInvitationRecord> {
    const row = await this.findCompanyMember(input.transactionProvider, {
      companyId: input.companyId,
      userId: input.userId,
    });
    if (!row || row.status !== "invited") {
      throw new Error("Pending invitation not found.");
    }

    await input.transactionProvider.transaction(async (transaction) => {
      await transaction
        .delete(companyMembers)
        .where(and(
          eq(companyMembers.companyId, input.companyId),
          eq(companyMembers.userId, input.userId),
        ));
    });

    return {
      createdAt: row.createdAt.toISOString(),
      emailAddress: row.emailAddress,
      id: this.createInvitationGraphqlId(input.companyId, input.userId),
      role: row.role,
      status: "invited",
      userId: input.userId,
    };
  }

  async removeMember(input: {
    companyId: string;
    transactionProvider: TransactionProviderInterface;
    userId: string;
  }): Promise<CompanyMemberAccessRecord> {
    const row = await this.findCompanyMember(input.transactionProvider, {
      companyId: input.companyId,
      userId: input.userId,
    });
    if (!row) {
      throw new Error("Company member not found.");
    }
    if (row.status !== "active") {
      throw new Error("Pending invitations must be revoked instead.");
    }

    if (row.role === "admin") {
      await this.assertAnotherActiveAdmin(input.transactionProvider, input);
    }

    const now = new Date();
    await input.transactionProvider.transaction(async (transaction) => {
      await transaction
        .update(tasks)
        .set({
          assignedAt: null,
          assignedUserId: null,
          updatedAt: now,
        })
        .where(and(
          eq(tasks.companyId, input.companyId),
          eq(tasks.assignedUserId, input.userId),
          ne(tasks.status, "completed"),
        ));
      await transaction
        .delete(companyMembers)
        .where(and(
          eq(companyMembers.companyId, input.companyId),
          eq(companyMembers.userId, input.userId),
        ));
    });

    return {
      createdAt: row.createdAt.toISOString(),
      emailAddress: row.emailAddress,
      id: this.createAccessGraphqlId(input.companyId, row.userId),
      name: this.formatMemberName(row),
      role: row.role,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      userId: row.userId,
    };
  }

  async updateMemberRole(input: {
    companyId: string;
    role: CompanyMemberRole;
    transactionProvider: TransactionProviderInterface;
    userId: string;
  }): Promise<CompanyMemberAccessRecord> {
    const now = new Date();
    await input.transactionProvider.transaction(async (transaction) => {
      await transaction
        .update(companyMembers)
        .set({
          role: input.role,
          updatedAt: now,
        })
        .where(and(
          eq(companyMembers.companyId, input.companyId),
          eq(companyMembers.userId, input.userId),
        ));
    });
    const row = await this.findCompanyMember(input.transactionProvider, {
      companyId: input.companyId,
      userId: input.userId,
    });
    if (!row) {
      throw new Error("Company member not found.");
    }

    return {
      createdAt: row.createdAt.toISOString(),
      emailAddress: row.emailAddress,
      id: this.createAccessGraphqlId(input.companyId, row.userId),
      name: this.formatMemberName(row),
      role: row.role,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      userId: row.userId,
    };
  }

  private createAccessGraphqlId(companyId: string, userId: string): string {
    return `CompanyMemberAccess:${companyId}:${userId}`;
  }

  private createInvitationGraphqlId(companyId: string, userId: string): string {
    return `CompanyMemberInvitation:${companyId}:${userId}`;
  }

  private async assertCanInviteUser(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      userId: string;
    },
  ): Promise<void> {
    const existingMember = await this.findCompanyMember(transactionProvider, input);
    if (existingMember?.status === "active") {
      throw new Error("This user is already an active company member.");
    }
  }

  private async assertAnotherActiveAdmin(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      userId: string;
    },
  ): Promise<void> {
    const [anotherAdmin] = await transactionProvider.transaction(async (transaction) => {
      return transaction
        .select({
          userId: companyMembers.userId,
        })
        .from(companyMembers)
        .where(and(
          eq(companyMembers.companyId, input.companyId),
          eq(companyMembers.role, "admin"),
          eq(companyMembers.status, "active"),
          ne(companyMembers.userId, input.userId),
        ))
        .limit(1) as Promise<Array<{ userId: string }>>;
    });

    if (!anotherAdmin) {
      throw new Error("You cannot remove the last active company admin.");
    }
  }

  private async findCompanyMember(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      userId: string;
    },
  ): Promise<CompanyMemberRow | null> {
    const [row] = await transactionProvider.transaction(async (transaction) => {
      return transaction
        .select({
          createdAt: companyMembers.createdAt,
          emailAddress: users.email,
          firstName: users.first_name,
          lastName: users.last_name,
          role: companyMembers.role,
          status: companyMembers.status,
          updatedAt: companyMembers.updatedAt,
          userId: users.id,
        })
        .from(companyMembers)
        .innerJoin(users, eq(companyMembers.userId, users.id))
        .where(and(
          eq(companyMembers.companyId, input.companyId),
          eq(companyMembers.userId, input.userId),
        ))
        .limit(1) as Promise<CompanyMemberRow[]>;
    });

    return row ?? null;
  }

  private async findOrCreateInvitedUser(
    transactionProvider: TransactionProviderInterface,
    emailAddress: string,
  ): Promise<UserRow> {
    return transactionProvider.transaction(async (transaction) => {
      const [existingUser] = await transaction
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.email, emailAddress))
        .limit(1) as UserRow[];
      if (existingUser) {
        return existingUser;
      }

      const now = new Date();
      const [createdUser] = await transaction
        .insert(users)
        .values({
          created_at: now,
          email: emailAddress,
          first_name: emailAddress,
          last_name: null,
          updated_at: now,
        })
        .onConflictDoNothing()
        .returning({
          id: users.id,
        }) as UserRow[];
      if (createdUser) {
        return createdUser;
      }

      const [concurrentUser] = await transaction
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.email, emailAddress))
        .limit(1) as UserRow[];
      if (!concurrentUser) {
        throw new Error("Failed to provision invited user.");
      }

      return concurrentUser;
    });
  }

  private formatMemberName(row: Pick<CompanyMemberRow, "emailAddress" | "firstName" | "lastName">): string {
    return [row.firstName, row.lastName].filter(Boolean).join(" ") || row.emailAddress;
  }
}
