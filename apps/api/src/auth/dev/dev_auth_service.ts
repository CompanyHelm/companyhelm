import { and, asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { AdminDatabase } from "../../db/admin_database.ts";
import { companies, companyMembers, users } from "../../db/schema.ts";
import { CompanyBootstrapService } from "../../services/bootstrap/company.ts";
import type { AuthSession } from "../auth_provider.ts";
import { DevAuthHeaders } from "./headers.ts";

type DevAuthUserRecord = {
  email: string;
  first_name: string;
  id: string;
  isPlatformAdmin: boolean;
  last_name: string | null;
};

type DevAuthCompanyRecord = {
  deletion_status: "active" | "deletion_requested";
  id: string;
  name: string;
  slug: string | null;
};

type DevAuthCompanyMembershipRecord = DevAuthCompanyRecord & {
  user_email: string;
  user_first_name: string;
  user_id: string;
  user_isPlatformAdmin: boolean;
  user_last_name: string | null;
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning(selection?: Record<string, unknown>): Promise<unknown[]>;
    };
  };
};

export type DevAuthUserSummaryDocument = {
  email: string;
  firstName: string;
  hasActiveCompany: boolean;
  id: string;
  lastName: string | null;
  primaryCompanyName: string | null;
  primaryCompanySlug: string | null;
};

export type DevAuthCompanyDocument = {
  id: string;
  name: string;
  slug: string;
};

export type DevAuthUserDetailDocument = {
  companies: DevAuthCompanyDocument[];
  user: {
    email: string;
    firstName: string;
    id: string;
    lastName: string | null;
  };
};

/**
 * Owns the dev-only user and company picker workflow. It keeps dev auth deliberately lightweight:
 * the browser selects a user and company, then the API trusts those explicit headers only while
 * the runtime auth provider is `dev`.
 */
@injectable()
export class DevAuthService {
  private readonly adminDatabase: AdminDatabase;
  private readonly companyBootstrapService: CompanyBootstrapService;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(CompanyBootstrapService) companyBootstrapService: CompanyBootstrapService,
  ) {
    this.adminDatabase = adminDatabase;
    this.companyBootstrapService = companyBootstrapService;
  }

  async signUp(input: {
    email: string;
    firstName: string;
    lastName?: string | null;
  }): Promise<DevAuthUserDetailDocument> {
    const db = this.adminDatabase.getDatabase();
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    const email = this.normalizeEmail(input.email);
    const firstName = this.normalizeFirstName(input.firstName);
    const lastName = this.normalizeLastName(input.lastName);

    return db.transaction(async (transaction) => {
      const existingUser = await this.findUserByEmail(transaction, email);
      if (existingUser) {
        throw new Error("An account with that email already exists.");
      }

      const insertableDatabase = transaction as unknown as InsertableDatabase;
      const now = new Date();
      const [createdUser] = await insertableDatabase
        .insert(users)
        .values({
          clerkUserId: null,
          created_at: now,
          email,
          first_name: firstName,
          isPlatformAdmin: false,
          last_name: lastName,
          updated_at: now,
        })
        .returning({
          email: users.email,
          first_name: users.first_name,
          id: users.id,
          isPlatformAdmin: users.isPlatformAdmin,
          last_name: users.last_name,
        }) as DevAuthUserRecord[];
      if (!createdUser) {
        throw new Error("Failed to provision the dev auth account.");
      }

      return this.buildUserDetailDocument(createdUser, []);
    });
  }

  async createCompany(input: {
    companyName: string;
    userId: string;
  }): Promise<DevAuthUserDetailDocument> {
    const db = this.adminDatabase.getDatabase();
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    const companyName = this.normalizeCompanyName(input.companyName);
    const userId = this.normalizeRequiredIdentifier(input.userId, "User ID is required.");

    return db.transaction(async (transaction) => {
      const user = await this.findUserById(transaction, userId);
      if (!user) {
        throw new Error("The requested dev auth user does not exist.");
      }

      const companySlug = await this.createUniqueCompanySlug(transaction, companyName);
      const insertableDatabase = transaction as unknown as InsertableDatabase;
      const [createdCompany] = await insertableDatabase
        .insert(companies)
        .values({
          clerkOrganizationId: null,
          name: companyName,
          plan: "free",
          slug: companySlug,
        })
        .returning({
          deletion_status: companies.deletionStatus,
          id: companies.id,
          name: companies.name,
          slug: companies.slug,
        }) as DevAuthCompanyRecord[];
      if (!createdCompany) {
        throw new Error("Failed to create the company.");
      }

      await this.companyBootstrapService.ensureMembership(transaction as never, {
        companyId: createdCompany.id,
        userId: user.id,
      });
      await this.companyBootstrapService.ensureCompanyDefaults(transaction as never, createdCompany.id);

      const membershipCompanies = await this.findMembershipCompanies(transaction, user.id);
      return this.buildUserDetailDocument(user, membershipCompanies);
    });
  }

  async loadUser(input: {
    email?: string;
    userId?: string;
  }): Promise<DevAuthUserDetailDocument> {
    const normalizedInput = this.normalizeUserLookup(input);
    const database = this.adminDatabase.getDatabase();
    const user = normalizedInput.userId
      ? await this.findUserById(database, normalizedInput.userId)
      : await this.findUserByEmail(database, normalizedInput.email ?? "");
    if (!user) {
      throw new Error("The requested dev auth user does not exist.");
    }

    const membershipCompanies = await this.findMembershipCompanies(database, user.id);
    return this.buildUserDetailDocument(user, membershipCompanies);
  }

  async listUsers(): Promise<DevAuthUserSummaryDocument[]> {
    const database = this.adminDatabase.getDatabase() as unknown as {
      select(selection: Record<string, unknown>): {
        from(table: unknown): {
          leftJoin(table: unknown, condition: unknown): {
            leftJoin(table: unknown, condition: unknown): {
              orderBy(...arguments_: unknown[]): Promise<unknown[]>;
            };
          };
        };
      };
    };
    const rows = await database
      .select({
        email: users.email,
        first_name: users.first_name,
        id: users.id,
        last_name: users.last_name,
        companyId: companies.id,
        companyName: companies.name,
        companySlug: companies.slug,
      })
      .from(users)
      .leftJoin(companyMembers, eq(companyMembers.userId, users.id))
      .leftJoin(companies, and(
        eq(companyMembers.companyId, companies.id),
        eq(companies.deletionStatus, "active"),
      ))
      .orderBy(asc(users.first_name), asc(users.last_name), asc(users.email)) as Array<{
      companyId: string | null;
      companyName: string | null;
      companySlug: string | null;
      email: string;
      first_name: string;
      id: string;
      last_name: string | null;
    }>;
    const summaries = new Map<string, DevAuthUserSummaryDocument>();

    for (const row of rows) {
      const existingSummary = summaries.get(row.id);
      if (existingSummary) {
        if (row.companyId) {
          existingSummary.hasActiveCompany = true;
        }
        continue;
      }

      summaries.set(row.id, {
        email: row.email,
        firstName: row.first_name,
        hasActiveCompany: row.companyId !== null,
        id: row.id,
        lastName: row.last_name,
        primaryCompanyName: row.companyName,
        primaryCompanySlug: row.companySlug,
      });
    }

    return Array.from(summaries.values());
  }

  async authenticateHeaders(headers: Record<string, unknown>): Promise<AuthSession> {
    const selection = DevAuthHeaders.requireSelection(headers);
    const membership = await this.findMembershipCompanyRecord(this.adminDatabase.getDatabase(), selection);
    if (!membership?.slug) {
      throw new Error("The selected dev auth company is unavailable for that user.");
    }

    return {
      company: {
        id: membership.id,
        name: membership.name,
      },
      token: `${selection.userId}:${selection.companyId}`,
      user: {
        email: membership.user_email,
        firstName: membership.user_first_name,
        id: membership.user_id,
        isPlatformAdmin: membership.user_isPlatformAdmin,
        lastName: membership.user_last_name,
        provider: "dev",
        providerSubject: `dev:${membership.user_id}`,
      },
    };
  }

  private buildUserDetailDocument(
    user: DevAuthUserRecord,
    membershipCompanies: DevAuthCompanyRecord[],
  ): DevAuthUserDetailDocument {
    return {
      companies: membershipCompanies
        .filter((company): company is DevAuthCompanyRecord & {
          slug: string;
        } => Boolean(company.slug))
        .map((company) => ({
          id: company.id,
          name: company.name,
          slug: company.slug,
        })),
      user: {
        email: user.email,
        firstName: user.first_name,
        id: user.id,
        lastName: user.last_name,
      },
    };
  }

  private async findUserByEmail(transaction: unknown, email: string): Promise<DevAuthUserRecord | null> {
    const database = transaction as {
      select(selection: Record<string, unknown>): {
        from(table: unknown): {
          where(condition: unknown): {
            limit(limit: number): Promise<unknown[]>;
          };
        };
      };
    };
    const [user] = await database
      .select({
        email: users.email,
        first_name: users.first_name,
        id: users.id,
        isPlatformAdmin: users.isPlatformAdmin,
        last_name: users.last_name,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1) as DevAuthUserRecord[];

    return user ?? null;
  }

  private async findUserById(transaction: unknown, userId: string): Promise<DevAuthUserRecord | null> {
    const database = transaction as {
      select(selection: Record<string, unknown>): {
        from(table: unknown): {
          where(condition: unknown): {
            limit(limit: number): Promise<unknown[]>;
          };
        };
      };
    };
    const [user] = await database
      .select({
        email: users.email,
        first_name: users.first_name,
        id: users.id,
        isPlatformAdmin: users.isPlatformAdmin,
        last_name: users.last_name,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1) as DevAuthUserRecord[];

    return user ?? null;
  }

  private async findMembershipCompanyRecord(
    transaction: unknown,
    input: {
      companyId: string;
      userId: string;
    },
  ): Promise<DevAuthCompanyMembershipRecord | null> {
    const database = transaction as {
      select(selection: Record<string, unknown>): {
        from(table: unknown): {
          innerJoin(table: unknown, condition: unknown): {
            innerJoin(table: unknown, condition: unknown): {
              where(condition: unknown): {
                limit(limit: number): Promise<unknown[]>;
              };
            };
          };
        };
      };
    };
    const [company] = await database
      .select({
        deletion_status: companies.deletionStatus,
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        user_email: users.email,
        user_first_name: users.first_name,
        user_id: users.id,
        user_isPlatformAdmin: users.isPlatformAdmin,
        user_last_name: users.last_name,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .innerJoin(users, eq(companyMembers.userId, users.id))
      .where(and(
        eq(companyMembers.companyId, input.companyId),
        eq(companyMembers.userId, input.userId),
        eq(companies.deletionStatus, "active"),
      ))
      .limit(1) as DevAuthCompanyMembershipRecord[];

    return company ?? null;
  }

  private async findMembershipCompanies(transaction: unknown, userId: string): Promise<DevAuthCompanyRecord[]> {
    const database = transaction as {
      select(selection: Record<string, unknown>): {
        from(table: unknown): {
          innerJoin(table: unknown, condition: unknown): {
            where(condition: unknown): {
              orderBy(...arguments_: unknown[]): Promise<unknown[]>;
            };
          };
        };
      };
    };

    return await database
      .select({
        deletion_status: companies.deletionStatus,
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(and(
        eq(companyMembers.userId, userId),
        eq(companies.deletionStatus, "active"),
      ))
      .orderBy(asc(companies.name)) as DevAuthCompanyRecord[];
  }

  private async createUniqueCompanySlug(transaction: unknown, companyName: string): Promise<string> {
    const baseSlug = this.createBaseSlug(companyName);
    const database = transaction as {
      select(selection: Record<string, unknown>): {
        from(table: unknown): {
          where(condition: unknown): {
            limit(limit: number): Promise<unknown[]>;
          };
        };
      };
    };

    for (let suffix = 0; suffix < 10_000; suffix += 1) {
      const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
      const [existingCompany] = await database
        .select({
          id: companies.id,
        })
        .from(companies)
        .where(eq(companies.slug, slug))
        .limit(1) as Array<{
        id: string;
      }>;
      if (!existingCompany) {
        return slug;
      }
    }

    throw new Error("Failed to allocate a unique company slug.");
  }

  private createBaseSlug(companyName: string): string {
    const slug = companyName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || "company";
  }

  private normalizeCompanyName(companyName: string): string {
    const normalizedCompanyName = String(companyName || "").trim();
    if (!normalizedCompanyName) {
      throw new Error("Company name is required.");
    }

    return normalizedCompanyName;
  }

  private normalizeEmail(email: string): string {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Email must be valid.");
    }

    return normalizedEmail;
  }

  private normalizeFirstName(firstName: string): string {
    const normalizedFirstName = String(firstName || "").trim();
    if (!normalizedFirstName) {
      throw new Error("First name is required.");
    }

    return normalizedFirstName;
  }

  private normalizeLastName(lastName: string | null | undefined): string | null {
    const normalizedLastName = String(lastName || "").trim();
    return normalizedLastName || null;
  }

  private normalizeRequiredIdentifier(value: string, errorMessage: string): string {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error(errorMessage);
    }

    return normalizedValue;
  }

  private normalizeUserLookup(input: {
    email?: string;
    userId?: string;
  }): {
    email?: string;
    userId?: string;
  } {
    const userId = String(input.userId || "").trim();
    const email = input.email ? this.normalizeEmail(input.email) : "";
    if (!userId && !email) {
      throw new Error("Either userId or email is required.");
    }

    return userId
      ? {
        userId,
      }
      : {
        email,
      };
  }
}
