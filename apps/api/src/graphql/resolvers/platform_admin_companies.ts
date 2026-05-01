import { and, asc, eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { companies, companyMembers } from "../../db/schema.ts";
import {
  EnhancedLoggingAdminService,
  type EnhancedLoggingAdminCompanyState,
} from "../../log/enhanced_logging_admin_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type PlatformAdminCompaniesArguments = {
  page: number;
  pageSize: number;
  search?: string | null;
  userId?: string | null;
};

type PlatformAdminCompanyRow = {
  clerkOrganizationId: string | null;
  id: string;
  memberCount: number;
  name: string;
  plan: "free" | "plus" | "pro";
  slug: string | null;
};

type PlatformAdminCompanyCountRow = {
  totalCount: number;
};

type GraphqlPlatformAdminCompany = {
  clerkOrganizationId: string | null;
  enhancedLogging: EnhancedLoggingAdminCompanyState;
  id: string;
  memberCount: number;
  name: string;
  plan: "free" | "plus" | "pro";
  slug: string | null;
};

type GraphqlPlatformAdminCompanyPage = {
  nodes: GraphqlPlatformAdminCompany[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

/**
 * Lists the global CompanyHelm company directory for platform admins, including a server-side
 * search filter so pagination stays accurate when the installation grows beyond one page.
 */
@injectable()
export class PlatformAdminCompaniesQueryResolver {
  private static readonly MAX_PAGE_SIZE = 100;

  private readonly enhancedLoggingAdminService: EnhancedLoggingAdminService;

  constructor(
    @inject(EnhancedLoggingAdminService)
    enhancedLoggingAdminService: EnhancedLoggingAdminService = new EnhancedLoggingAdminService(),
  ) {
    this.enhancedLoggingAdminService = enhancedLoggingAdminService;
  }

  execute = async (
    _root: unknown,
    arguments_: PlatformAdminCompaniesArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlPlatformAdminCompanyPage> => {
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
    const filterCondition = this.buildFilterCondition(arguments_.search, arguments_.userId);

    const companyPage = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const countRows = filterCondition
        ? await tx
          .select({
            totalCount: sql<number>`count(*)::int`,
          })
          .from(companies)
          .where(filterCondition) as PlatformAdminCompanyCountRow[]
        : await tx
          .select({
            totalCount: sql<number>`count(*)::int`,
          })
          .from(companies) as PlatformAdminCompanyCountRow[];
      const totalCount = countRows[0]?.totalCount ?? 0;
      const companyRows = filterCondition
        ? await tx
          .select({
            clerkOrganizationId: companies.clerkOrganizationId,
            id: companies.id,
            memberCount: sql<number>`count(${companyMembers.userId})::int`.as("member_count"),
            name: companies.name,
            plan: companies.plan,
            slug: companies.slug,
          })
          .from(companies)
          .leftJoin(companyMembers, eq(companyMembers.companyId, companies.id))
          .where(filterCondition)
          .groupBy(
            companies.clerkOrganizationId,
            companies.id,
            companies.name,
            companies.plan,
            companies.slug,
          )
          .orderBy(asc(companies.name), asc(companies.id))
          .limit(pageSize)
          .offset(offset) as PlatformAdminCompanyRow[]
        : await tx
          .select({
            clerkOrganizationId: companies.clerkOrganizationId,
            id: companies.id,
            memberCount: sql<number>`count(${companyMembers.userId})::int`.as("member_count"),
            name: companies.name,
            plan: companies.plan,
            slug: companies.slug,
          })
          .from(companies)
          .leftJoin(companyMembers, eq(companyMembers.companyId, companies.id))
          .groupBy(
            companies.clerkOrganizationId,
            companies.id,
            companies.name,
            companies.plan,
            companies.slug,
          )
          .orderBy(asc(companies.name), asc(companies.id))
          .limit(pageSize)
          .offset(offset) as PlatformAdminCompanyRow[];

      return {
        nodes: companyRows,
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      };
    });

    return {
      ...companyPage,
      nodes: await Promise.all(companyPage.nodes.map(async (companyRow) => ({
        clerkOrganizationId: companyRow.clerkOrganizationId,
        enhancedLogging: await this.enhancedLoggingAdminService.getCompanyState(companyRow.id),
        id: companyRow.id,
        memberCount: companyRow.memberCount,
        name: companyRow.name,
        plan: companyRow.plan,
        slug: companyRow.slug,
      }))),
    };
  };

  private buildFilterCondition(search: string | null | undefined, userId: string | null | undefined) {
    const conditions = [
      this.buildSearchCondition(search),
      this.buildUserMembershipCondition(userId),
    ].filter((condition) => condition !== null);

    if (conditions.length === 0) {
      return null;
    }

    return and(...conditions);
  }

  private buildSearchCondition(search: string | null | undefined) {
    const trimmedSearch = search?.trim() ?? "";
    if (trimmedSearch.length === 0) {
      return null;
    }

    const searchPattern = `%${trimmedSearch}%`;
    return sql<boolean>`
      ${companies.name} ilike ${searchPattern}
      or coalesce(${companies.slug}, '') ilike ${searchPattern}
      or ${companies.id}::text ilike ${searchPattern}
      or coalesce(${companies.clerkOrganizationId}, '') ilike ${searchPattern}
    `;
  }

  private buildUserMembershipCondition(userId: string | null | undefined) {
    const trimmedUserId = userId?.trim() ?? "";
    if (trimmedUserId.length === 0) {
      return null;
    }

    return sql<boolean>`
      exists (
        select 1
        from ${companyMembers}
        where ${companyMembers.companyId} = ${companies.id}
          and ${companyMembers.userId} = ${trimmedUserId}
      )
    `;
  }

  private normalizePage(page: number): number {
    if (!Number.isInteger(page) || page < 1) {
      throw new Error("Page must be a positive integer.");
    }

    return page;
  }

  private normalizePageSize(pageSize: number): number {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > PlatformAdminCompaniesQueryResolver.MAX_PAGE_SIZE) {
      throw new Error(`Page size must be between 1 and ${PlatformAdminCompaniesQueryResolver.MAX_PAGE_SIZE}.`);
    }

    return pageSize;
  }
}
