import { randomUUID } from "node:crypto";
import { inject, injectable } from "inversify";
import type { TransactionSql } from "postgres";
import { AdminDatabase } from "../../db/admin_database.ts";

export type CreatedCompanyRecord = {
  id: string;
  name: string;
  slug: string;
};

type CompanyInsertRow = {
  id: string;
  slug: string;
};

/**
 * Owns user-initiated company creation so the application database remains the source of truth for
 * names, slugs, and membership links.
 */
@injectable()
export class CompanyCreationService {
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

  async createCompany(input: {
    name: string;
    userId: string;
  }): Promise<CreatedCompanyRecord> {
    const companyName = this.normalizeCompanyName(input.name);
    return await this.adminDatabase.getSqlClient().begin(async (sql) => {
      await sql.unsafe("select pg_advisory_xact_lock(hashtextextended($1, 0))", [input.userId]);
      const companyId = this.createCompanyId();
      const slug = await this.createUniqueCompanySlug(sql, companyName);
      const [company] = await sql.unsafe<CompanyInsertRow[]>([
        "insert into companies (id, name, slug)",
        "values ($1, $2, $3)",
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

      return {
        id: company.id,
        name: companyName,
        slug: company.slug,
      };
    });
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
