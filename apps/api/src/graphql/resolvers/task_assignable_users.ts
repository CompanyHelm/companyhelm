import { eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { companyMembers, users } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type MembershipRow = {
  userId: string;
};

type UserRow = {
  email: string;
  firstName: string;
  id: string;
  lastName: string | null;
};

type GraphqlTaskAssignableUser = {
  displayName: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string | null;
};

/**
 * Lists the human company members that tasks can be assigned to. The tasks UI uses this focused
 * resolver instead of a broader people API so task assignment can stay self-contained.
 */
@injectable()
export class TaskAssignableUsersQueryResolver extends Resolver<GraphqlTaskAssignableUser[]> {
  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlTaskAssignableUser[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const membershipRows = await tx
        .select({
          userId: companyMembers.userId,
        })
        .from(companyMembers)
        .where(eq(companyMembers.companyId, context.authSession!.company!.id)) as MembershipRow[];
      if (membershipRows.length === 0) {
        return [];
      }

      const userRows = await tx
        .select({
          email: users.email,
          firstName: users.first_name,
          id: users.id,
          lastName: users.last_name,
        })
        .from(users)
        .where(inArray(users.id, membershipRows.map((membershipRow) => membershipRow.userId))) as UserRow[];

      return [...userRows]
        .sort((left, right) => {
          const leftName = TaskAssignableUsersQueryResolver.formatDisplayName(left);
          const rightName = TaskAssignableUsersQueryResolver.formatDisplayName(right);
          return leftName.localeCompare(rightName);
        })
        .map((userRow) => ({
          displayName: TaskAssignableUsersQueryResolver.formatDisplayName(userRow),
          email: userRow.email,
          firstName: userRow.firstName,
          id: userRow.id,
          lastName: userRow.lastName,
        }));
    });
  };

  private static formatDisplayName(userRow: UserRow): string {
    return userRow.lastName ? `${userRow.firstName} ${userRow.lastName}` : userRow.firstName;
  }
}
