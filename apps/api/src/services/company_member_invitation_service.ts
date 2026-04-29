import { createClerkClient } from "@clerk/backend";
import { and, asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { companies, companyMembers, users } from "../db/schema.ts";
import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";
import type { CompanyMemberRole, CompanyMemberStatus } from "./company_member_permission_service.ts";

export type CompanyMemberInvitationRecord = {
  createdAt: string;
  emailAddress: string;
  id: string;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
};

export type CompanyMemberAccessRecord = {
  createdAt: string;
  emailAddress: string;
  id: string;
  name: string;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  updatedAt: string;
};

type ClerkOrganizationInvitationRecord = {
  createdAt: number;
  emailAddress: string;
  id: string;
  status?: string;
};

type ClerkClientDependency = {
  organizations: {
    createOrganizationInvitation(params: {
      emailAddress: string;
      inviterUserId?: string;
      organizationId: string;
      redirectUrl: string;
      role: "org:admin";
    }): Promise<ClerkOrganizationInvitationRecord>;
    revokeOrganizationInvitation(params: {
      invitationId: string;
      organizationId: string;
      requestingUserId?: string;
    }): Promise<ClerkOrganizationInvitationRecord>;
  };
};

type CompanyMemberRow = {
  clerkInvitationId: string | null;
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
 * Manages CompanyHelm member rows and mirrors invitations to Clerk while keeping CompanyHelm roles
 * authoritative for product permissions.
 */
@injectable()
export class CompanyMemberInvitationService {
  private readonly config: Config;
  private clerkClient: ClerkClientDependency | null = null;

  constructor(
    @inject(Config) config: Config,
  ) {
    this.config = config;
  }

  static createForTest(
    config: Config,
    clerkClient: ClerkClientDependency,
  ): CompanyMemberInvitationService {
    const service = new CompanyMemberInvitationService(config);
    service.clerkClient = clerkClient;
    return service;
  }

  async inviteMember(input: {
    companyId: string;
    emailAddress: string;
    inviterUserId: string | null;
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

    const clerkOrganizationId = await this.resolveClerkOrganizationId(input.transactionProvider, input.companyId);
    const invitation = await this.getClerkClient().organizations.createOrganizationInvitation({
      emailAddress: input.emailAddress,
      inviterUserId: input.inviterUserId ?? undefined,
      organizationId: clerkOrganizationId,
      redirectUrl: this.config.webPublicUrl,
      role: "org:admin",
    });
    const now = new Date();
    await input.transactionProvider.transaction(async (transaction) => {
      await transaction
        .insert(companyMembers)
        .values({
          clerkInvitationId: invitation.id,
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
            clerkInvitationId: invitation.id,
            role: input.role,
            status: "invited",
            updatedAt: now,
          },
        });
    });

    return {
      createdAt: this.formatClerkTimestamp(invitation.createdAt),
      emailAddress: invitation.emailAddress,
      id: user.id,
      role: input.role,
      status: "invited",
    };
  }

  async listMembers(input: {
    companyId: string;
    transactionProvider: TransactionProviderInterface;
  }): Promise<CompanyMemberAccessRecord[]> {
    const rows = await input.transactionProvider.transaction(async (transaction) => {
      return transaction
        .select({
          clerkInvitationId: companyMembers.clerkInvitationId,
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
      id: row.userId,
      name: this.formatMemberName(row),
      role: row.role,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async revokeInvitation(input: {
    companyId: string;
    requestingUserId: string | null;
    transactionProvider: TransactionProviderInterface;
    userId: string;
  }): Promise<CompanyMemberInvitationRecord> {
    const row = await this.findCompanyMember(input.transactionProvider, {
      companyId: input.companyId,
      userId: input.userId,
    });
    if (!row || row.status !== "invited" || !row.clerkInvitationId) {
      throw new Error("Pending invitation not found.");
    }

    const clerkOrganizationId = await this.resolveClerkOrganizationId(input.transactionProvider, input.companyId);
    const invitation = await this.getClerkClient().organizations.revokeOrganizationInvitation({
      invitationId: row.clerkInvitationId,
      organizationId: clerkOrganizationId,
      requestingUserId: input.requestingUserId ?? undefined,
    });

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
      emailAddress: invitation.emailAddress,
      id: input.userId,
      role: row.role,
      status: "invited",
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
      id: row.userId,
      name: this.formatMemberName(row),
      role: row.role,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    };
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
          clerkInvitationId: companyMembers.clerkInvitationId,
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
          clerkUserId: null,
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

  private async resolveClerkOrganizationId(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<string> {
    const [company] = await transactionProvider.transaction(async (transaction) => {
      return transaction
        .select({
          clerkOrganizationId: companies.clerkOrganizationId,
        })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
    });

    if (!company?.clerkOrganizationId) {
      throw new Error("This company is not linked to a Clerk organization.");
    }

    return company.clerkOrganizationId;
  }

  private getClerkClient(): ClerkClientDependency {
    if (!this.clerkClient) {
      if (this.config.auth.provider !== "clerk") {
        throw new Error("Clerk organization invitations require Clerk auth configuration.");
      }

      this.clerkClient = createClerkClient({
        publishableKey: this.config.auth.clerk.publishable_key,
        secretKey: this.config.auth.clerk.secret_key,
      }) as unknown as ClerkClientDependency;
    }

    return this.clerkClient;
  }

  private formatClerkTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString();
  }

  private formatMemberName(row: Pick<CompanyMemberRow, "emailAddress" | "firstName" | "lastName">): string {
    return [row.firstName, row.lastName].filter(Boolean).join(" ") || row.emailAddress;
  }
}
