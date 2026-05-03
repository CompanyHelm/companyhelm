import { createClerkClient } from "@clerk/backend";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { AdminDatabase } from "../db/admin_database.ts";

type ClerkClientDependency = {
  users: {
    deleteUser(userId: string): Promise<unknown>;
  };
};

type PlatformAdminUserDeletionUserRecord = {
  clerkUserId: string | null;
  email: string;
  id: string;
};

type PlatformAdminUserDeletionMembershipRecord = {
  companyId: string;
};

type PlatformAdminUserDeletionBlockerRecord = {
  label: string;
  totalCount: number;
};

type TransactionSqlTag = <T>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>;

export type PlatformAdminUserDeletionPayload = {
  clerkUserId: string | null;
  email: string;
  id: string;
  membershipCount: number;
};

/**
 * Deletes a product user from the platform-admin boundary, mirroring the account removal to Clerk
 * before removing local memberships and the local user row under the admin database role.
 */
@injectable()
export class PlatformAdminUserDeletionService {
  private readonly adminDatabase: AdminDatabase;
  private readonly config: Config;
  private clerkClient: ClerkClientDependency | null = null;

  constructor(
    @inject(Config) config: Config,
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
  ) {
    this.adminDatabase = adminDatabase;
    this.config = config;
  }

  static createForTest(
    config: Config,
    adminDatabase: AdminDatabase,
    clerkClient: ClerkClientDependency | null,
  ): PlatformAdminUserDeletionService {
    const service = new PlatformAdminUserDeletionService(config, adminDatabase);
    service.clerkClient = clerkClient;
    return service;
  }

  async deleteUser(input: {
    confirmationEmail: string;
    requestingUserId: string;
    userId: string;
  }): Promise<PlatformAdminUserDeletionPayload> {
    if (input.userId === input.requestingUserId) {
      throw new Error("You cannot delete your own user account.");
    }

    const user = await this.loadUser(input.userId);
    if (input.confirmationEmail !== user.email) {
      throw new Error("Type the user email exactly to delete this user.");
    }

    await this.assertNoDeletionBlockers(user.id);
    const memberships = await this.loadMemberships(user.id);
    await this.deleteClerkUser(user.clerkUserId);
    await this.deleteLocalUser(user.id);

    return {
      clerkUserId: user.clerkUserId,
      email: user.email,
      id: user.id,
      membershipCount: memberships.length,
    };
  }

  private async loadUser(userId: string): Promise<PlatformAdminUserDeletionUserRecord> {
    const sql = this.adminDatabase.getSqlClient();
    const [user] = await sql<PlatformAdminUserDeletionUserRecord[]>`
      SELECT
        clerk_user_id AS "clerkUserId",
        email,
        id
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    if (!user) {
      throw new Error("User not found.");
    }

    return user;
  }

  private async loadMemberships(userId: string): Promise<PlatformAdminUserDeletionMembershipRecord[]> {
    const sql = this.adminDatabase.getSqlClient();
    return sql<PlatformAdminUserDeletionMembershipRecord[]>`
      SELECT company_id AS "companyId"
      FROM company_members
      WHERE user_id = ${userId}
    `;
  }

  private async assertNoDeletionBlockers(userId: string): Promise<void> {
    const sql = this.adminDatabase.getSqlClient();
    const blockerRows = await sql<PlatformAdminUserDeletionBlockerRecord[]>`
      SELECT 'company secrets' AS label, count(*)::int AS "totalCount"
      FROM company_secrets
      WHERE created_by_user_id = ${userId}
        OR updated_by_user_id = ${userId}
      UNION ALL
      SELECT 'inbox answers' AS label, count(*)::int AS "totalCount"
      FROM agent_inbox_human_question_answers
      WHERE answered_by_user_id = ${userId}
    `;
    const blockers = blockerRows.filter((row) => row.totalCount > 0);
    if (blockers.length === 0) {
      return;
    }

    throw new Error(`User cannot be deleted while referenced by ${blockers.map((row) => row.label).join(", ")}.`);
  }

  private async deleteClerkUser(clerkUserId: string | null): Promise<void> {
    if (!clerkUserId) {
      return;
    }

    try {
      await this.getClerkClient().users.deleteUser(clerkUserId);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return;
      }

      throw error;
    }
  }

  private async deleteLocalUser(userId: string): Promise<void> {
    const sql = this.adminDatabase.getSqlClient();
    await sql.begin(async (transaction) => {
      const tx = transaction as unknown as TransactionSqlTag;
      await tx`
        UPDATE tasks
        SET
          assigned_at = NULL,
          assigned_user_id = NULL,
          updated_at = now()
        WHERE assigned_user_id = ${userId}
          AND status <> 'completed'
      `;
      await tx`
        DELETE FROM company_members
        WHERE user_id = ${userId}
      `;
      await tx`
        DELETE FROM platform_admins
        WHERE user_id = ${userId}
      `;
      await tx`
        DELETE FROM users
        WHERE id = ${userId}
      `;
    });
  }

  private getClerkClient(): ClerkClientDependency {
    if (!this.clerkClient) {
      if (this.config.auth.provider !== "clerk") {
        throw new Error("Clerk user deletion requires Clerk auth configuration.");
      }

      this.clerkClient = createClerkClient({
        publishableKey: this.config.auth.clerk.publishable_key,
        secretKey: this.config.auth.clerk.secret_key,
      }) as unknown as ClerkClientDependency;
    }

    return this.clerkClient;
  }

  private isNotFoundError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
      return false;
    }

    const maybeStatusError = error as {
      status?: unknown;
      statusCode?: unknown;
    };
    return maybeStatusError.status === 404 || maybeStatusError.statusCode === 404;
  }
}
