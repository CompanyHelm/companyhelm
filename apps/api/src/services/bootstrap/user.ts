import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import type { DatabaseTransactionInterface } from "../../db/database_interface.ts";
import { users } from "../../db/schema.ts";

type UserRecord = {
  id: string;
  clerk_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string | null;
};

type BootstrapInsertableDatabase = DatabaseTransactionInterface & {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      onConflictDoNothing(): {
        returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
      };
      returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
    };
  };
};

type BootstrapInsertOperation = {
  onConflictDoNothing(): {
    returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
  };
};

/**
 * Provisions the local user row that backs authenticated requests. Its scope is keeping the
 * provider-subject lookup, email fallback reconciliation, and duplicate-insert race handling out of
 * the auth transport so every sign-in path can reuse the same user bootstrap behavior.
 */
@injectable()
export class UserBootstrapService {
  async findOrCreateUser(
    transaction: DatabaseTransactionInterface,
    params: {
      loadUser: () => Promise<{
        email: string;
        firstName: string;
        lastName: string | null;
      }>;
      providerSubject: string;
    },
  ): Promise<UserRecord> {
    const existingUser = await this.findUserByColumn(
      transaction,
      users.clerkUserId,
      params.providerSubject,
    );
    if (existingUser) {
      return existingUser;
    }

    const loadedUser = await params.loadUser();
    const existingUserByEmail = await this.findUserByColumn(
      transaction,
      users.email,
      loadedUser.email,
    );
    if (existingUserByEmail) {
      return existingUserByEmail;
    }

    const now = new Date();
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const insertOperation = insertableDatabase
      .insert(users)
      .values({
        clerkUserId: params.providerSubject,
        email: loadedUser.email,
        first_name: loadedUser.firstName,
        last_name: loadedUser.lastName,
        created_at: now,
        updated_at: now,
      }) as BootstrapInsertOperation;
    const insertResult = insertOperation
      .onConflictDoNothing()
      .returning?.({
        id: users.id,
        clerk_user_id: users.clerkUserId,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
      });
    const createdRows = insertResult ? await insertResult as UserRecord[] : [];
    const createdUser = createdRows[0];
    if (createdUser) {
      return createdUser;
    }

    const concurrentUser = await this.findUserByColumn(
      transaction,
      users.clerkUserId,
      params.providerSubject,
    ) ?? await this.findUserByColumn(
      transaction,
      users.email,
      loadedUser.email,
    );
    if (!concurrentUser) {
      throw new Error("Failed to provision Clerk user after duplicate insert.");
    }

    return concurrentUser;
  }

  private async findUserByColumn(
    transaction: DatabaseTransactionInterface,
    column: unknown,
    value: string,
  ): Promise<UserRecord | null> {
    const [existingUser] = await transaction
      .select({
        id: users.id,
        clerk_user_id: users.clerkUserId,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
      })
      .from(users)
      .where(eq(column as never, value))
      .limit(1) as UserRecord[];

    return existingUser ?? null;
  }
}
