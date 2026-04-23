import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { companies, companyMembers, localAuthSessions, users } from "../../db/schema.ts";
import { CompanyBootstrapService } from "../../services/bootstrap/company.ts";
import type { AuthSession } from "../auth_provider.ts";
import { LocalAuthService, type LocalAuthSessionDocument } from "../local/local_auth_service.ts";
import { LocalAuthSessionService } from "../local/local_auth_session_service.ts";

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

/**
 * Owns the dev-only passwordless auth workflow: browse users, impersonate one of them, create new
 * users with a fresh company, or attach an existing user to a newly created company.
 */
@injectable()
export class DevAuthService {
  private readonly companyBootstrapService: CompanyBootstrapService;
  private readonly config: Extract<Config["auth"], {
    provider: "dev";
  }> | null;
  private readonly database: AppRuntimeDatabase;
  private readonly localAuthService: LocalAuthService;
  private readonly sessionService: LocalAuthSessionService;

  constructor(
    @inject(Config) config: Config,
    @inject(AppRuntimeDatabase) database: AppRuntimeDatabase,
    @inject(LocalAuthSessionService) sessionService: LocalAuthSessionService,
    @inject(LocalAuthService) localAuthService: LocalAuthService,
    @inject(CompanyBootstrapService) companyBootstrapService: CompanyBootstrapService,
  ) {
    this.companyBootstrapService = companyBootstrapService;
    this.config = config.auth.provider === "dev" ? config.auth : null;
    this.database = database;
    this.localAuthService = localAuthService;
    this.sessionService = sessionService;
  }

  async signIn(input: {
    email?: string;
    userId?: string;
  }): Promise<LocalAuthSessionDocument> {
    const db = this.database.getDatabase();
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    const normalizedInput = this.normalizeUserLookup(input);

    return db.transaction(async (transaction) => {
      const user = normalizedInput.userId
        ? await this.findUserById(transaction, normalizedInput.userId)
        : await this.findUserByEmail(transaction, normalizedInput.email ?? "");
      if (!user) {
        throw new Error("The requested dev auth user does not exist.");
      }

      const company = await this.findFirstMembershipCompany(transaction, user.id);
      if (!company) {
        throw new Error("This user has no active company. Create one before signing in.");
      }

      await this.database.applyCompanyContext(transaction as never, company.id);
      await this.companyBootstrapService.ensureMembership(transaction as never, {
        companyId: company.id,
        userId: user.id,
      });
      await this.companyBootstrapService.ensureCompanyDefaults(transaction as never, company.id);

      return this.createSessionDocument(transaction, user.id, company.id);
    });
  }

  async signUp(input: {
    companyName: string;
    email: string;
    firstName: string;
    lastName?: string | null;
  }): Promise<LocalAuthSessionDocument> {
    const db = this.database.getDatabase();
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    const companyName = this.normalizeCompanyName(input.companyName);
    const email = this.normalizeEmail(input.email);
    const firstName = this.normalizeFirstName(input.firstName);
    const lastName = this.normalizeLastName(input.lastName);

    return db.transaction(async (transaction) => {
      const existingUser = await this.findUserByEmail(transaction, email);
      if (existingUser) {
        throw new Error("An account with that email already exists.");
      }

      const companySlug = await this.createUniqueCompanySlug(transaction, companyName);
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
      if (!createdUser || !createdCompany) {
        throw new Error("Failed to provision the dev auth account.");
      }

      await this.database.applyCompanyContext(transaction as never, createdCompany.id);
      await this.companyBootstrapService.ensureMembership(transaction as never, {
        companyId: createdCompany.id,
        userId: createdUser.id,
      });
      await this.companyBootstrapService.ensureCompanyDefaults(transaction as never, createdCompany.id, {
        seedAgent: true,
      });

      return this.createSessionDocument(transaction, createdUser.id, createdCompany.id);
    });
  }

  async createCompany(input: {
    companyName: string;
    email?: string;
    userId?: string;
  }): Promise<LocalAuthSessionDocument> {
    const db = this.database.getDatabase();
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    const companyName = this.normalizeCompanyName(input.companyName);
    const normalizedInput = this.normalizeUserLookup(input);

    return db.transaction(async (transaction) => {
      const user = normalizedInput.userId
        ? await this.findUserById(transaction, normalizedInput.userId)
        : await this.findUserByEmail(transaction, normalizedInput.email ?? "");
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

      await this.database.applyCompanyContext(transaction as never, createdCompany.id);
      await this.companyBootstrapService.ensureMembership(transaction as never, {
        companyId: createdCompany.id,
        userId: user.id,
      });
      await this.companyBootstrapService.ensureCompanyDefaults(transaction as never, createdCompany.id, {
        seedAgent: true,
      });

      return this.createSessionDocument(transaction, user.id, createdCompany.id);
    });
  }

  async loadSession(token: string): Promise<LocalAuthSessionDocument> {
    return this.localAuthService.loadSession(token);
  }

  async signOut(token: string): Promise<void> {
    await this.localAuthService.signOut(token);
  }

  async listUsers(): Promise<DevAuthUserSummaryDocument[]> {
    const database = this.database.getDatabase() as unknown as {
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

  async authenticateBearerToken(token: string): Promise<AuthSession> {
    const session = await this.localAuthService.authenticateBearerToken(token);
    return {
      ...session,
      user: {
        ...session.user,
        provider: "dev",
        providerSubject: `dev:${session.user.id}`,
      },
    };
  }

  private async createSessionDocument(
    transaction: unknown,
    userId: string,
    companyId: string,
  ): Promise<LocalAuthSessionDocument> {
    const config = this.requireDevConfig();
    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (config.dev.session_duration_hours * 60 * 60 * 1000));
    const insertableDatabase = transaction as InsertableDatabase;

    await insertableDatabase
      .insert(localAuthSessions)
      .values({
        companyId,
        createdAt: now,
        expiresAt,
        id: sessionId,
        updatedAt: now,
        userId,
      })
      .returning();

    const token = await this.sessionService.createSessionToken({
      companyId,
      sessionId,
      userId,
    });

    return this.localAuthService.loadSession(token);
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

  private async findFirstMembershipCompany(transaction: unknown, userId: string): Promise<DevAuthCompanyRecord | null> {
    const database = transaction as {
      select(selection: Record<string, unknown>): {
        from(table: unknown): {
          innerJoin(table: unknown, condition: unknown): {
            where(condition: unknown): {
              orderBy(...arguments_: unknown[]): {
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
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(and(
        eq(companyMembers.userId, userId),
        eq(companies.deletionStatus, "active"),
      ))
      .orderBy(asc(companies.name))
      .limit(1) as DevAuthCompanyRecord[];

    return company ?? null;
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

  private requireDevConfig(): Extract<Config["auth"], {
    provider: "dev";
  }> {
    if (!this.config) {
      throw new Error("Dev auth service requires dev auth configuration.");
    }

    return this.config;
  }
}
