import { asc, eq, sql } from "drizzle-orm";
import { injectable } from "inversify";
import { companies, companyMembers } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type PlatformAdminCompaniesArguments = {
  page: number;
  pageSize: number;
  search?: string | null;
};

type PlatformAdminCompanyRow = {
  clerkOrganizationId: string | null;
  deletionRequestedAt: Date | null;
  deletionStatus: "active" | "deletion_requested";
  id: string;
  memberCount: number;
  name: string;
  plan: "free" | "pro";
  slug: string | null;
};

type PlatformAdminCompanyCountRow = {
  totalCount: number;
};

type GraphqlPlatformAdminCompany = {
  clerkOrganizationId: string | null;
  deletionRequestedAt: string | null;
  deletionStatus: "active" | "deletion_requested";
  id: string;
  memberCount: number;
  name: string;
  plan: "free" | "pro";
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
    if (context.authSession.user.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }

    const page = this.normalizePage(arguments_.page);
    const pageSize = this.normalizePageSize(arguments_.pageSize);
    const offset = (page - 1) * pageSize;
    const searchCondition = this.buildSearchCondition(arguments_.search);

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const countRows = searchCondition
        ? await tx
          .select({
            totalCount: sql<number>`count(*)::int`,
          })
          .from(companies)
          .where(searchCondition) as PlatformAdminCompanyCountRow[]
        : await tx
          .select({
            totalCount: sql<number>`count(*)::int`,
          })
          .from(companies) as PlatformAdminCompanyCountRow[];
      const totalCount = countRows[0]?.totalCount ?? 0;
      const companyRows = searchCondition
        ? await tx
          .select({
            clerkOrganizationId: companies.clerkOrganizationId,
            deletionRequestedAt: companies.deletionRequestedAt,
            deletionStatus: companies.deletionStatus,
            id: companies.id,
            memberCount: sql<number>`count(${companyMembers.userId})::int`.as("member_count"),
            name: companies.name,
            plan: companies.plan,
            slug: companies.slug,
          })
          .from(companies)
          .leftJoin(companyMembers, eq(companyMembers.companyId, companies.id))
          .where(searchCondition)
          .groupBy(
            companies.clerkOrganizationId,
            companies.deletionRequestedAt,
            companies.deletionStatus,
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
            deletionRequestedAt: companies.deletionRequestedAt,
            deletionStatus: companies.deletionStatus,
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
            companies.deletionRequestedAt,
            companies.deletionStatus,
            companies.id,
            companies.name,
            companies.plan,
            companies.slug,
          )
          .orderBy(asc(companies.name), asc(companies.id))
          .limit(pageSize)
          .offset(offset) as PlatformAdminCompanyRow[];

      return {
        nodes: companyRows.map((companyRow) => ({
          clerkOrganizationId: companyRow.clerkOrganizationId,
          deletionRequestedAt: companyRow.deletionRequestedAt?.toISOString() ?? null,
          deletionStatus: companyRow.deletionStatus,
          id: companyRow.id,
          memberCount: companyRow.memberCount,
          name: companyRow.name,
          plan: companyRow.plan,
          slug: companyRow.slug,
        })),
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
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
      ${companies.name} ilike ${searchPattern}
      or coalesce(${companies.slug}, '') ilike ${searchPattern}
      or ${companies.id}::text ilike ${searchPattern}
      or coalesce(${companies.clerkOrganizationId}, '') ilike ${searchPattern}
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
