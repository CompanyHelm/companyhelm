import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { platformAdmins, users } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type GrantPlatformAdminMutationArguments = {
  input: {
    userId: string;
  };
};

type PlatformAdminUserGrantRow = {
  createdAt: Date;
  email: string;
  firstName: string;
  id: string;
  lastName: string | null;
  updatedAt: Date;
};

type GraphqlPlatformAdminUser = {
  createdAt: string;
  email: string;
  firstName: string;
  id: string;
  isPlatformAdmin: boolean;
  lastName: string | null;
  updatedAt: string;
};

/**
 * Grants global CompanyHelm administration to an existing user while keeping the privilege change
 * explicit in the platform-admin join table instead of a mutable user-profile column.
 */
@injectable()
export class GrantPlatformAdminMutation extends Mutation<
  GrantPlatformAdminMutationArguments,
  GraphqlPlatformAdminUser
> {
  protected resolve = async (
    arguments_: GrantPlatformAdminMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlPlatformAdminUser> => {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }
    const grantedByUserId = context.authSession.user.id;

    return transactionProvider.transaction(async (tx) => {
      const [targetUser] = await tx
        .select({
          createdAt: users.created_at,
          email: users.email,
          firstName: users.first_name,
          id: users.id,
          lastName: users.last_name,
          updatedAt: users.updated_at,
        })
        .from(users)
        .where(eq(users.id, arguments_.input.userId))
        .limit(1) as PlatformAdminUserGrantRow[];
      if (!targetUser) {
        throw new Error("User not found.");
      }

      await tx
        .insert(platformAdmins)
        .values({
          createdAt: new Date(),
          grantedByUserId,
          userId: targetUser.id,
        })
        .onConflictDoNothing();

      return {
        createdAt: targetUser.createdAt.toISOString(),
        email: targetUser.email,
        firstName: targetUser.firstName,
        id: targetUser.id,
        isPlatformAdmin: true,
        lastName: targetUser.lastName,
        updatedAt: targetUser.updatedAt.toISOString(),
      };
    });
  };
}
