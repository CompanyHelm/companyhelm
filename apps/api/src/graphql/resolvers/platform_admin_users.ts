import { desc, eq, sql } from "drizzle-orm";
import { injectable } from "inversify";
import { companyMembers, platformAdmins, users } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type PlatformAdminUsersArguments = {
  page: number;
  pageSize: number;
};

type PlatformAdminUserRow = {
  createdAt: Date;
  email: string;
  firstName: string;
  id: string;
  isPlatformAdmin: boolean;
  lastName: string | null;
  updatedAt: Date;
};

type PlatformAdminUserCountRow = {
  totalCount: number;
};

type GraphqlPlatformAdminUser = {
  companyCount: number;
  createdAt: string;
  email: string;
  firstName: string;
  id: string;
  isPlatformAdmin: boolean;
  lastName: string | null;
  updatedAt: string;
};

type GraphqlPlatformAdminUserPage = {
  nodes: GraphqlPlatformAdminUser[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

/**
 * Lists the global CompanyHelm user directory for platform admins. It stays outside company-scoped
 * membership queries because the admin dashboard needs one place to inspect every product user.
 */
@injectable()
export class PlatformAdminUsersQueryResolver {
  private static readonly MAX_PAGE_SIZE = 100;

  execute = async (
    _root: unknown,
    arguments_: PlatformAdminUsersArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlPlatformAdminUserPage> => {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }

    const page = this.normalizePage(arguments_.page);
    const pageSize = this.normalizePageSize(arguments_.pageSize);
    const offset = (page - 1) * pageSize;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const [countRow] = await tx
        .select({
          totalCount: sql<number>`count(*)::int`,
        })
        .from(users) as PlatformAdminUserCountRow[];
      const totalCount = countRow?.totalCount ?? 0;
      const membershipCounts = tx
        .select({
          companyCount: sql<number>`count(*)::int`.as("company_count"),
          userId: companyMembers.userId,
        })
        .from(companyMembers)
        .groupBy(companyMembers.userId)
        .as("membership_counts");
      const userRows = await tx
        .select({
          companyCount: sql<number>`coalesce(${membershipCounts.companyCount}, 0)::int`,
          createdAt: users.created_at,
          email: users.email,
          firstName: users.first_name,
          id: users.id,
          isPlatformAdmin: sql<boolean>`exists (
            select 1
            from ${platformAdmins}
            where ${platformAdmins.userId} = ${users.id}
          )`,
          lastName: users.last_name,
          updatedAt: users.updated_at,
        })
        .from(users)
        .leftJoin(membershipCounts, eq(membershipCounts.userId, users.id))
        .orderBy(desc(users.created_at), desc(users.id))
        .limit(pageSize)
        .offset(offset) as Array<PlatformAdminUserRow & { companyCount: number }>;

      return {
        nodes: userRows.map((userRow) => ({
          companyCount: userRow.companyCount,
          createdAt: userRow.createdAt.toISOString(),
          email: userRow.email,
          firstName: userRow.firstName,
          id: userRow.id,
          isPlatformAdmin: userRow.isPlatformAdmin,
          lastName: userRow.lastName,
          updatedAt: userRow.updatedAt.toISOString(),
        })),
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      };
    });
  };

  private normalizePage(page: number): number {
    if (!Number.isInteger(page) || page < 1) {
      throw new Error("Page must be a positive integer.");
    }

    return page;
  }

  private normalizePageSize(pageSize: number): number {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > PlatformAdminUsersQueryResolver.MAX_PAGE_SIZE) {
      throw new Error(`Page size must be between 1 and ${PlatformAdminUsersQueryResolver.MAX_PAGE_SIZE}.`);
    }

    return pageSize;
  }
}
