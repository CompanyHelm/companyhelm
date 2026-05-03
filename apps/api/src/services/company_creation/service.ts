import { randomUUID } from "node:crypto";
import { inject, injectable } from "inversify";
import type { TransactionSql } from "postgres";
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
};

type CompanyInsertRow = {
  id: string;
  slug: string;
};

type CountRow = {
  count: string;
};

/**
 * Owns user-initiated company creation so the application database remains the source of truth for
 * names, slugs, plans, and membership limits.
 */
@injectable()
export class CompanyCreationService {
  private static readonly PLATFORM_ADMIN_FREE_COMPANY_LIMIT = 1000;
  private static readonly STANDARD_FREE_COMPANY_LIMIT = 3;

  private readonly adminDatabase: AdminDatabase;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
  ) {
    this.adminDatabase = adminDatabase;
  }

  static createForTest(
    adminDatabase: AdminDatabase,
  ): CompanyCreationService {
    return new CompanyCreationService(adminDatabase);
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
    isPlatformAdmin: boolean;
    name: string;
    userId: string;
  }): Promise<CreatedCompanyRecord> {
    const companyName = this.normalizeCompanyName(input.name);
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

      await this.createOpeningSubscriptionWallet(sql, company.id);

      return {
        id: company.id,
        name: companyName,
        slug: company.slug,
      };
    });
  }

  private async createOpeningSubscriptionWallet(sql: TransactionSql, companyId: string): Promise<void> {
    const walletId = randomUUID();
    const transactionId = randomUUID();
    await sql.unsafe([
      "with inserted_wallet as (",
      "  insert into wallets (id, company_id, type, amount_nano_usd, created_at, updated_at)",
      "  values ($1, $2, 'subscription', 10000000000, now(), now())",
      "  on conflict (company_id, type) do nothing",
      "  returning id, company_id",
      ")",
      "insert into wallet_transactions (",
      "  id, company_id, wallet_id, category, amount_nano_usd,",
      "  period_start, period_end, session_id, session_turn_id, created_at",
      ")",
      "select",
      "  $3, company_id, id, 'opening', 10000000000,",
      "  date_trunc('month', timezone('UTC', now()))::timestamptz,",
      "  (date_trunc('month', timezone('UTC', now())) + interval '1 month')::timestamptz,",
      "  null, null, now()",
      "from inserted_wallet",
      "on conflict do nothing",
    ].join("\n"), [walletId, companyId, transactionId]);
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
