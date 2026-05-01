import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import {
  companies,
  companyMembers,
  localAuthCredentials,
  localAuthSessions,
  users,
} from "../../db/schema.ts";
import { CompanyBootstrapService } from "../../services/bootstrap/company.ts";
import { Config } from "../../config/schema.ts";
import type { AuthSession } from "../auth_provider.ts";
import { LocalAuthPasswordService } from "./local_auth_password_service.ts";
import { LocalAuthSessionService } from "./local_auth_session_service.ts";

type LocalAuthUserRecord = {
  email: string;
  first_name: string;
  id: string;
  last_name: string | null;
};

type LocalAuthCompanyRecord = {
  id: string;
  name: string;
  slug: string | null;
};

type LocalAuthCredentialRecord = LocalAuthUserRecord & {
  passwordHash: string;
  passwordSalt: string;
};

type LocalAuthSessionRecord = LocalAuthCompanyRecord & LocalAuthUserRecord & {
  expiresAt: Date;
  revokedAt: Date | null;
  sessionId: string;
};

export type LocalAuthSessionDocument = {
  activeOrganizationId: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  token: string;
  user: {
    email: string;
    firstName: string;
    id: string;
    lastName: string | null;
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning(selection?: Record<string, unknown>): Promise<unknown[]>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

/**
 * Owns the local credential workflow end-to-end: account creation, password verification, bearer
 * session issuance, session lookup, and sign-out revocation.
 */
@injectable()
export class LocalAuthService {
  private readonly companyBootstrapService: CompanyBootstrapService;
  private readonly config: Extract<Config["auth"], {
    provider: "local";
  }> | null;
  private readonly database: AppRuntimeDatabase;
  private readonly passwordService: LocalAuthPasswordService;
  private readonly sessionService: LocalAuthSessionService;

  constructor(
    @inject(Config) config: Config,
    @inject(AppRuntimeDatabase) database: AppRuntimeDatabase,
    @inject(LocalAuthPasswordService) passwordService: LocalAuthPasswordService,
    @inject(LocalAuthSessionService) sessionService: LocalAuthSessionService,
    @inject(CompanyBootstrapService) companyBootstrapService: CompanyBootstrapService,
  ) {
    this.companyBootstrapService = companyBootstrapService;
    this.config = config.auth.provider === "local" ? config.auth : null;
    this.database = database;
    this.passwordService = passwordService;
    this.sessionService = sessionService;
  }

  async signUp(input: {
    companyName: string;
    email: string;
    firstName: string;
    lastName?: string | null;
    password: string;
  }): Promise<LocalAuthSessionDocument> {
    const config = this.requireLocalConfig();
    const db = this.database.getDatabase();
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    const companyName = this.normalizeCompanyName(input.companyName);
    const email = this.normalizeEmail(input.email);
    const firstName = this.normalizeFirstName(input.firstName);
    const lastName = this.normalizeLastName(input.lastName);
    const password = this.normalizePassword(input.password);
    const passwordHashRecord = await this.passwordService.createPasswordHash(
      password,
      config.local.password_pepper,
    );

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
          last_name: lastName,
          updated_at: now,
        })
        .returning({
          email: users.email,
          first_name: users.first_name,
          id: users.id,
          last_name: users.last_name,
        }) as LocalAuthUserRecord[];
      const [createdCompany] = await insertableDatabase
        .insert(companies)
        .values({
          clerkOrganizationId: null,
          name: companyName,
          plan: "free",
          slug: companySlug,
        })
        .returning({
          id: companies.id,
          name: companies.name,
          slug: companies.slug,
        }) as LocalAuthCompanyRecord[];
      if (!createdUser || !createdCompany?.slug) {
        throw new Error("Failed to provision the local auth account.");
      }

      await this.database.applyCompanyContext(transaction as never, createdCompany.id);
      await this.companyBootstrapService.ensureMembership(transaction as never, {
        companyId: createdCompany.id,
        userId: createdUser.id,
      });
      await this.companyBootstrapService.ensureCompanyDefaults(transaction as never, createdCompany.id);

      await insertableDatabase
        .insert(localAuthCredentials)
        .values({
          createdAt: now,
          passwordHash: passwordHashRecord.passwordHash,
          passwordSalt: passwordHashRecord.passwordSalt,
          updatedAt: now,
          userId: createdUser.id,
        })
        .returning();

      return this.createSessionDocument(transaction, createdUser, {
        ...createdCompany,
        slug: createdCompany.slug,
      });
    });
  }

  async signIn(input: {
    email: string;
    password: string;
  }): Promise<LocalAuthSessionDocument> {
    const config = this.requireLocalConfig();
    const db = this.database.getDatabase();
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    const email = this.normalizeEmail(input.email);
    const password = this.normalizePassword(input.password);

    return db.transaction(async (transaction) => {
      const credentialRecord = await this.findCredentialByEmail(transaction, email);
      if (!credentialRecord) {
        throw new Error("Invalid email or password.");
      }

      const isValidPassword = await this.passwordService.verifyPassword({
        password,
        passwordHash: credentialRecord.passwordHash,
        passwordSalt: credentialRecord.passwordSalt,
        pepper: config.local.password_pepper,
      });
      if (!isValidPassword) {
        throw new Error("Invalid email or password.");
      }

      const company = await this.findFirstMembershipCompany(transaction, credentialRecord.id);
      if (!company?.slug) {
        throw new Error("The account is not assigned to an active company.");
      }

      await this.database.applyCompanyContext(transaction as never, company.id);
      await this.companyBootstrapService.ensureMembership(transaction as never, {
        companyId: company.id,
        userId: credentialRecord.id,
      });
      await this.companyBootstrapService.ensureCompanyDefaults(transaction as never, company.id);

      return this.createSessionDocument(transaction, credentialRecord, {
        ...company,
        slug: company.slug,
      });
    });
  }

  async loadSession(token: string): Promise<LocalAuthSessionDocument> {
    const sessionRecord = await this.loadSessionRecord(token);
    return this.buildSessionDocument(token, sessionRecord);
  }

  async signOut(token: string): Promise<void> {
    const tokenClaims = await this.sessionService.verifySessionToken(token);
    const updatableDatabase = this.database.getDatabase() as unknown as UpdatableDatabase;

    await updatableDatabase
      .update(localAuthSessions)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(localAuthSessions.id, tokenClaims.sessionId));
  }

  async authenticateBearerToken(token: string): Promise<AuthSession> {
    const sessionRecord = await this.loadSessionRecord(token);

    return {
      company: {
        id: sessionRecord.id,
        name: sessionRecord.name,
      },
      token,
      user: {
        email: sessionRecord.email,
        firstName: sessionRecord.first_name,
        id: sessionRecord.id_user,
        lastName: sessionRecord.last_name,
        provider: "local",
        providerSubject: `local:${sessionRecord.id_user}`,
      },
    };
  }

  private async createSessionDocument(
    transaction: unknown,
    user: LocalAuthUserRecord,
    company: LocalAuthCompanyRecord & {
      slug: string;
    },
  ): Promise<LocalAuthSessionDocument> {
    const config = this.requireLocalConfig();
    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (config.local.session_duration_hours * 60 * 60 * 1000));
    const insertableDatabase = transaction as InsertableDatabase;

    await insertableDatabase
      .insert(localAuthSessions)
      .values({
        companyId: company.id,
        createdAt: now,
        expiresAt,
        id: sessionId,
        updatedAt: now,
        userId: user.id,
      })
      .returning();

    const token = await this.sessionService.createSessionToken({
      companyId: company.id,
      sessionId,
      userId: user.id,
    });

    return this.buildSessionDocument(token, {
      ...company,
      ...user,
      expiresAt,
      id_user: user.id,
      revokedAt: null,
      sessionId,
    });
  }

  private buildSessionDocument(
    token: string,
    sessionRecord: LocalAuthSessionRecord & {
      id_user: string;
      slug: string;
    },
  ): LocalAuthSessionDocument {
    return {
      activeOrganizationId: sessionRecord.id,
      organizations: [{
        id: sessionRecord.id,
        name: sessionRecord.name,
        slug: sessionRecord.slug,
      }],
      token,
      user: {
        email: sessionRecord.email,
        firstName: sessionRecord.first_name,
        id: sessionRecord.id_user,
        lastName: sessionRecord.last_name,
      },
    };
  }

  private async loadSessionRecord(token: string): Promise<LocalAuthSessionRecord & {
    id_user: string;
    slug: string;
  }> {
    const tokenClaims = await this.sessionService.verifySessionToken(token);
    const database = this.database.getDatabase() as unknown as {
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
    const [sessionRecord] = await database
      .select({
        email: users.email,
        expiresAt: localAuthSessions.expiresAt,
        first_name: users.first_name,
        id: companies.id,
        id_user: users.id,
        last_name: users.last_name,
        name: companies.name,
        revokedAt: localAuthSessions.revokedAt,
        sessionId: localAuthSessions.id,
        slug: companies.slug,
      })
      .from(localAuthSessions)
      .innerJoin(users, eq(localAuthSessions.userId, users.id))
      .innerJoin(companies, eq(localAuthSessions.companyId, companies.id))
      .where(and(
        eq(localAuthSessions.companyId, tokenClaims.companyId),
        eq(localAuthSessions.id, tokenClaims.sessionId),
        eq(localAuthSessions.userId, tokenClaims.userId),
      ))
      .limit(1) as Array<LocalAuthSessionRecord & {
      id_user: string;
      slug: string | null;
    }>;
    if (!sessionRecord?.slug) {
      throw new Error("Local auth session is invalid.");
    }
    if (sessionRecord.revokedAt) {
      throw new Error("Local auth session has been revoked.");
    }
    if (sessionRecord.expiresAt.getTime() <= Date.now()) {
      throw new Error("Local auth session has expired.");
    }

    return {
      ...sessionRecord,
      slug: sessionRecord.slug,
    };
  }

  private async findUserByEmail(transaction: unknown, email: string): Promise<LocalAuthUserRecord | null> {
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
        last_name: users.last_name,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1) as LocalAuthUserRecord[];

    return user ?? null;
  }

  private async findCredentialByEmail(transaction: unknown, email: string): Promise<LocalAuthCredentialRecord | null> {
    const database = transaction as {
      select(selection: Record<string, unknown>): {
        from(table: unknown): {
          innerJoin(table: unknown, condition: unknown): {
            where(condition: unknown): {
              limit(limit: number): Promise<unknown[]>;
            };
          };
        };
      };
    };
    const [credential] = await database
      .select({
        email: users.email,
        first_name: users.first_name,
        id: users.id,
        last_name: users.last_name,
        passwordHash: localAuthCredentials.passwordHash,
        passwordSalt: localAuthCredentials.passwordSalt,
      })
      .from(users)
      .innerJoin(localAuthCredentials, eq(localAuthCredentials.userId, users.id))
      .where(eq(users.email, email))
      .limit(1) as LocalAuthCredentialRecord[];

    return credential ?? null;
  }

  private async findFirstMembershipCompany(transaction: unknown, userId: string): Promise<LocalAuthCompanyRecord | null> {
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
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(and(
        eq(companyMembers.userId, userId),
        eq(companyMembers.status, "active"),
      ))
      .orderBy(asc(companies.name))
      .limit(1) as LocalAuthCompanyRecord[];

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

  private normalizePassword(password: string): string {
    const normalizedPassword = String(password || "");
    if (normalizedPassword.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    return normalizedPassword;
  }

  private requireLocalConfig(): Extract<Config["auth"], {
    provider: "local";
  }> {
    if (!this.config) {
      throw new Error("Local auth service requires local auth configuration.");
    }

    return this.config;
  }
}
