import { randomUUID } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { inject, injectable } from "inversify";
import type { TransactionSql } from "postgres";
import { Config } from "../../config/schema.ts";
import { AdminDatabase } from "../../db/admin_database.ts";

export type FreeCompanyCreationEligibility = {
  allowed: boolean;
  currentFreeCompanyCount: number;
  limit: number;
  reason: string | null;
};

export type CreatedCompanyRecord = {
  id: string;
  name: string;
  slug: string;
  clerkOrganizationId: string | null;
};

type ClerkOrganizationRecord = {
  id: string;
  slug: string;
};

type ClerkClientDependency = {
  organizations: {
    createOrganization(params: {
      createdBy?: string;
      name: string;
      slug: string;
    }): Promise<ClerkOrganizationRecord>;
    deleteOrganization(organizationId: string): Promise<unknown>;
  };
};

type CompanyInsertRow = {
  id: string;
  slug: string;
};

type CompanyUpdateRow = {
  clerk_organization_id: string | null;
};

type CountRow = {
  count: string;
};

/**
 * Owns user-initiated company creation so the application database remains the source of truth for
 * names, slugs, plans, and membership limits while Clerk receives a mirrored organization record.
 */
@injectable()
export class CompanyCreationService {
  private static readonly PLATFORM_ADMIN_FREE_COMPANY_LIMIT = 1000;
  private static readonly STANDARD_FREE_COMPANY_LIMIT = 3;

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
    clerkClient: ClerkClientDependency,
  ): CompanyCreationService {
    const service = new CompanyCreationService(config, adminDatabase);
    service.clerkClient = clerkClient;
    return service;
  }

  async getFreeCompanyCreationEligibility(input: {
    isPlatformAdmin: boolean;
    userId: string;
  }): Promise<FreeCompanyCreationEligibility> {
    const sql = this.adminDatabase.getSqlClient();
    const [countRow] = await sql<CountRow[]>`
      select count(*)::text as count
      from company_members
      join companies on companies.id = company_members.company_id
      where company_members.user_id = ${input.userId}
        and companies.plan = 'free'
        and not exists (
          select 1
          from company_deletion_requests
          where company_deletion_requests.company_id = companies.id
            and company_deletion_requests.status in ('requested', 'processing', 'failed')
        )
    `;

    return this.buildEligibility({
      currentFreeCompanyCount: Number.parseInt(countRow?.count ?? "0", 10),
      isPlatformAdmin: input.isPlatformAdmin,
    });
  }

  async createCompany(input: {
    clerkUserId: string | null;
    isPlatformAdmin: boolean;
    name: string;
    userId: string;
  }): Promise<CreatedCompanyRecord> {
    const companyName = this.normalizeCompanyName(input.name);
    let createdClerkOrganizationId: string | null = null;
    try {
      return await this.adminDatabase.getSqlClient().begin(async (sql) => {
        await sql.unsafe("select pg_advisory_xact_lock(hashtextextended($1, 0))", [input.userId]);
        const [countRow] = await sql.unsafe<CountRow[]>([
          "select count(*)::text as count",
          "from company_members",
          "join companies on companies.id = company_members.company_id",
          "where company_members.user_id = $1",
          "and companies.plan = 'free'",
          "and not exists (",
          "  select 1",
          "  from company_deletion_requests",
          "  where company_deletion_requests.company_id = companies.id",
          "    and company_deletion_requests.status in ('requested', 'processing', 'failed')",
          ")",
        ].join("\n"), [input.userId]);
        const eligibility = this.buildEligibility({
          currentFreeCompanyCount: Number.parseInt(countRow?.count ?? "0", 10),
          isPlatformAdmin: input.isPlatformAdmin,
        });
        if (!eligibility.allowed) {
          throw new Error(eligibility.reason ?? this.buildFreeCompanyLimitReason(eligibility.limit));
        }

        const companyId = this.createCompanyId();
        const slug = await this.createUniqueCompanySlug(sql, companyName);
        const [company] = await sql.unsafe<CompanyInsertRow[]>([
          "insert into companies (id, name, slug, plan)",
          "values ($1, $2, $3, 'free')",
          "returning id, slug",
        ].join("\n"), [companyId, companyName, slug]);
        if (!company) {
          throw new Error("Failed to create the company.");
        }

        await sql.unsafe([
          "insert into company_members (company_id, user_id, role, status, created_at, updated_at)",
          "values ($1, $2, 'admin', 'active', now(), now())",
          "on conflict do nothing",
        ].join("\n"), [company.id, input.userId]);

        const clerkOrganization = await this.createClerkOrganization({
          clerkUserId: input.clerkUserId,
          name: companyName,
          slug: company.slug,
        });
        createdClerkOrganizationId = clerkOrganization?.id ?? null;

        const [updatedCompany] = await sql.unsafe<CompanyUpdateRow[]>([
          "update companies",
          "set clerk_organization_id = $1",
          "where id = $2",
          "returning clerk_organization_id",
        ].join("\n"), [createdClerkOrganizationId, company.id]);
        if (createdClerkOrganizationId && updatedCompany?.clerk_organization_id !== createdClerkOrganizationId) {
          throw new Error("Failed to link the Clerk organization to the company.");
        }

        return {
          id: company.id,
          name: companyName,
          slug: company.slug,
          clerkOrganizationId: updatedCompany?.clerk_organization_id ?? null,
        };
      });
    } catch (error) {
      await this.deleteCreatedClerkOrganization(createdClerkOrganizationId);
      throw error;
    }
  }

  private buildEligibility(input: {
    currentFreeCompanyCount: number;
    isPlatformAdmin: boolean;
  }): FreeCompanyCreationEligibility {
    const limit = this.resolveFreeCompanyLimit(input.isPlatformAdmin);
    const allowed = input.currentFreeCompanyCount < limit;
    return {
      allowed,
      currentFreeCompanyCount: input.currentFreeCompanyCount,
      limit,
      reason: allowed ? null : this.buildFreeCompanyLimitReason(limit),
    };
  }

  private resolveFreeCompanyLimit(isPlatformAdmin: boolean): number {
    return isPlatformAdmin
      ? CompanyCreationService.PLATFORM_ADMIN_FREE_COMPANY_LIMIT
      : CompanyCreationService.STANDARD_FREE_COMPANY_LIMIT;
  }

  private buildFreeCompanyLimitReason(limit: number): string {
    return `Free accounts can belong to at most ${limit} free companies.`;
  }

  private createCompanyId(): string {
    return randomUUID();
  }

  private async createClerkOrganization(input: {
    clerkUserId: string | null;
    name: string;
    slug: string;
  }): Promise<ClerkOrganizationRecord | null> {
    if (this.config.auth.provider !== "clerk") {
      return null;
    }

    return this.getClerkClient().organizations.createOrganization({
      createdBy: input.clerkUserId ?? undefined,
      name: input.name,
      slug: input.slug,
    });
  }

  private async createUniqueCompanySlug(
    sql: TransactionSql,
    companyName: string,
  ): Promise<string> {
    const baseSlug = this.createSlugBase(companyName);
    for (let suffix = 0; suffix < 100; suffix += 1) {
      const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
      const existingRows = await sql.unsafe<Array<{ id: string }>>([
        "select id",
        "from companies",
        "where slug = $1",
        "limit 1",
      ].join("\n"), [slug]);
      if (existingRows.length === 0) {
        return slug;
      }
    }

    throw new Error("Failed to allocate a unique company slug.");
  }

  private createSlugBase(companyName: string): string {
    const slug = companyName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "");
    return slug || "company";
  }

  private async deleteCreatedClerkOrganization(clerkOrganizationId: string | null): Promise<void> {
    if (!clerkOrganizationId || this.config.auth.provider !== "clerk") {
      return;
    }

    await this.getClerkClient().organizations.deleteOrganization(clerkOrganizationId);
  }

  private getClerkClient(): ClerkClientDependency {
    if (!this.clerkClient) {
      if (this.config.auth.provider !== "clerk") {
        throw new Error("Clerk organization creation requires Clerk auth configuration.");
      }

      this.clerkClient = createClerkClient({
        publishableKey: this.config.auth.clerk.publishable_key,
        secretKey: this.config.auth.clerk.secret_key,
      }) as unknown as ClerkClientDependency;
    }

    return this.clerkClient;
  }

  private normalizeCompanyName(rawName: string): string {
    const companyName = rawName.trim();
    if (companyName.length === 0) {
      throw new Error("Company name is required.");
    }
    if (companyName.length > 255) {
      throw new Error("Company name must be 255 characters or fewer.");
    }

    return companyName;
  }
}
