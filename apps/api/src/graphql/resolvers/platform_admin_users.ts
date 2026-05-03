import { asc, desc, eq, sql } from "drizzle-orm";
import { injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { companies, companyMembers, platformAdmins, users } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type PlatformAdminUsersArguments = {
  page: number;
  pageSize: number;
  search?: string | null;
};

type PlatformAdminUserArguments = {
  id: string;
};

type PlatformAdminUserRow = {
  clerkUserId: string | null;
  createdAt: Date;
  email: string;
  firstName: string;
  id: string;
  isPlatformAdmin: boolean;
  lastName: string | null;
  updatedAt: Date;
};

type PlatformAdminUserCompanyMembershipRow = {
  companyId: string;
  companyName: string;
  companyPlan: "free" | "plus" | "pro";
  companySlug: string | null;
  createdAt: Date;
  role: "admin" | "member";
  status: "active" | "invited";
  updatedAt: Date;
};

type PlatformAdminUserCountRow = {
  totalCount: number;
};

type GraphqlPlatformAdminUser = {
  clerkUserId: string | null;
  createdAt: string;
  email: string;
  firstName: string;
  id: string;
  isPlatformAdmin: boolean;
  lastName: string | null;
  updatedAt: string;
};

type GraphqlPlatformAdminUserCompanyMembership = {
  companyId: string;
  companyName: string;
  companyPlan: "free" | "plus" | "pro";
  companySlug: string | null;
  createdAt: string;
  role: "admin" | "member";
  status: "active" | "invited";
  updatedAt: string;
};

type GraphqlPlatformAdminUserDetail = GraphqlPlatformAdminUser & {
  companyMemberships: GraphqlPlatformAdminUserCompanyMembership[];
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
    const searchCondition = this.buildSearchCondition(arguments_.search);

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const countRows = searchCondition
        ? await tx
          .select({
            totalCount: sql<number>`count(*)::int`,
          })
          .from(users)
          .where(searchCondition) as PlatformAdminUserCountRow[]
        : await tx
          .select({
            totalCount: sql<number>`count(*)::int`,
          })
          .from(users) as PlatformAdminUserCountRow[];
      const [countRow] = countRows;
      const totalCount = countRow?.totalCount ?? 0;
      const userRows = searchCondition
        ? await tx
          .select({
            clerkUserId: users.clerkUserId,
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
          .where(searchCondition)
          .orderBy(desc(users.created_at), desc(users.id))
          .limit(pageSize)
          .offset(offset) as PlatformAdminUserRow[]
        : await tx
          .select({
            clerkUserId: users.clerkUserId,
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
          .orderBy(desc(users.created_at), desc(users.id))
          .limit(pageSize)
          .offset(offset) as PlatformAdminUserRow[];

      return {
        nodes: userRows.map((userRow) => ({
          clerkUserId: userRow.clerkUserId,
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

  executeUser = async (
    _root: unknown,
    arguments_: PlatformAdminUserArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlPlatformAdminUserDetail> => {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const [userRow] = await tx
        .select({
          clerkUserId: users.clerkUserId,
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
        .where(eq(users.id, arguments_.id))
        .limit(1) as PlatformAdminUserRow[];

      if (!userRow) {
        throw new Error("User not found.");
      }

      const membershipRows = await tx
        .select({
          companyId: companies.id,
          companyName: companies.name,
          companyPlan: companies.plan,
          companySlug: companies.slug,
          createdAt: companyMembers.createdAt,
          role: companyMembers.role,
          status: companyMembers.status,
          updatedAt: companyMembers.updatedAt,
        })
        .from(companyMembers)
        .innerJoin(companies, eq(companies.id, companyMembers.companyId))
        .where(eq(companyMembers.userId, userRow.id))
        .orderBy(asc(companies.name), asc(companies.id)) as PlatformAdminUserCompanyMembershipRow[];

      return {
        clerkUserId: userRow.clerkUserId,
        companyMemberships: membershipRows.map((membershipRow) => ({
          companyId: membershipRow.companyId,
          companyName: membershipRow.companyName,
          companyPlan: membershipRow.companyPlan,
          companySlug: membershipRow.companySlug,
          createdAt: membershipRow.createdAt.toISOString(),
          role: membershipRow.role,
          status: membershipRow.status,
          updatedAt: membershipRow.updatedAt.toISOString(),
        })),
        createdAt: userRow.createdAt.toISOString(),
        email: userRow.email,
        firstName: userRow.firstName,
        id: userRow.id,
        isPlatformAdmin: userRow.isPlatformAdmin,
        lastName: userRow.lastName,
        updatedAt: userRow.updatedAt.toISOString(),
      };
    });
  };

  private buildSearchCondition(search: string | null | undefined) {
    const trimmedSearch = search?.trim() ?? "";
    if (trimmedSearch.length === 0) {
      return null;
    }

    const searchPattern = `%${trimmedSearch}%`;
    return sql<boolean>`
      ${users.id}::text ilike ${searchPattern}
      or coalesce(${users.clerkUserId}, '') ilike ${searchPattern}
      or ${users.email} ilike ${searchPattern}
      or ${users.first_name} ilike ${searchPattern}
      or coalesce(${users.last_name}, '') ilike ${searchPattern}
    `;
  }

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
