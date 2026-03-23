import { and, eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import type { Config } from "../../config/schema.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { companies, companyMembers, users } from "../../db/schema.ts";
import {
  AuthProvider,
  type AuthProviderDatabase,
  type AuthProviderDatabaseTransaction,
  type AuthenticateBearerTokenHeaders,
  type AuthSession,
} from "../auth_provider.ts";

type UserRecord = {
  id: string;
  clerk_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string | null;
};

type CompanyRecord = {
  id: string;
  clerk_organization_id: string | null;
  name: string;
};

/**
 * Verifies Clerk session tokens and lazily provisions local user, company, and membership records.
 */
export class ClerkAuthProvider extends AuthProvider {
  readonly name = "clerk" as const;
  private readonly clerkClient: Pick<ReturnType<typeof createClerkClient>, "authenticateRequest">;
  private readonly config: NonNullable<Config["auth"]["clerk"]>;
  private readonly database: Pick<AppRuntimeDatabase, "applyCompanyContext">;

  constructor(
    config: NonNullable<Config["auth"]["clerk"]>,
    dependencies: {
      appRuntimeDatabase?: Pick<AppRuntimeDatabase, "applyCompanyContext">;
      clerkClient?: Pick<ReturnType<typeof createClerkClient>, "authenticateRequest">;
    } = {},
  ) {
    super();
    this.config = config;
    this.database = dependencies.appRuntimeDatabase ?? {
      async applyCompanyContext() {},
    };
    this.clerkClient = dependencies.clerkClient ?? createClerkClient({
      secretKey: config.secret_key,
      publishableKey: config.publishable_key,
    });
  }

  async authenticateBearerToken(
    db: AuthProviderDatabase,
    token: string,
    headers: AuthenticateBearerTokenHeaders = {},
  ): Promise<AuthSession> {
    void headers;
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    const requestState = await this.clerkClient.authenticateRequest(
      ClerkAuthProvider.createClerkRequest(token, this.config.authorized_parties[0]),
      {
        authorizedParties: this.config.authorized_parties,
        jwtKey: this.config.jwt_key,
      },
    );
    if (!requestState.isAuthenticated) {
      throw new Error("Clerk bearer token is invalid.");
    }

    const authenticatedRequest = requestState.toAuth();
    if (!authenticatedRequest.isAuthenticated || !authenticatedRequest.sessionClaims) {
      throw new Error("Clerk bearer token did not resolve an authenticated session.");
    }

    const claims = authenticatedRequest.sessionClaims;
    ClerkAuthProvider.verifyStatus(claims.sts);
    const providerSubject = this.requireClaim(authenticatedRequest.userId, "Clerk bearer token is missing a subject.");
    const email = this.normalizeEmail(this.resolveEmail(claims));
    const { firstName, lastName } = this.resolvePersonName(claims, email);
    const organizationSubject = this.resolveOrganizationSubject(claims, authenticatedRequest.orgId);
    if (!organizationSubject) {
      throw new Error("Clerk bearer token is missing an active organization claim.");
    }

    const organizationName = this.resolveOrganizationName(claims, organizationSubject);

    return db.transaction(async (transaction) => {
      const user = await this.findOrCreateUser(transaction, {
        providerSubject,
        email,
        firstName,
        lastName,
      });
      const company = await this.findOrCreateCompany(transaction, {
        providerSubject: organizationSubject,
        name: organizationName,
      });
      await this.database.applyCompanyContext(
        transaction as AuthProviderDatabase,
        company.id,
      );
      await this.ensureMembership(transaction, {
        companyId: company.id,
        userId: user.id,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          provider: "clerk",
          providerSubject,
        },
        company: {
          id: company.id,
          name: company.name,
        },
      };
    });
  }

  private async findOrCreateUser(
    transaction: AuthProviderDatabaseTransaction,
    params: {
      providerSubject: string;
      email: string;
      firstName: string;
      lastName: string | null;
    },
  ): Promise<UserRecord> {
    const [existingUser] = await transaction
      .select({
        id: users.id,
        clerk_user_id: users.clerkUserId,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
      })
      .from(users)
      .where(eq(users.clerkUserId, params.providerSubject))
      .limit(1) as UserRecord[];
    if (existingUser) {
      return existingUser;
    }

    const now = new Date();
    const [createdUser] = await transaction
      .insert(users)
      .values({
        clerkUserId: params.providerSubject,
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        created_at: now,
        updated_at: now,
      })
      .returning?.({
        id: users.id,
        clerk_user_id: users.clerkUserId,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
      }) as Promise<UserRecord[]>;
    if (!createdUser) {
      throw new Error("Failed to provision Clerk user.");
    }

    return createdUser;
  }

  private async findOrCreateCompany(
    transaction: AuthProviderDatabaseTransaction,
    params: {
      providerSubject: string;
      name: string;
    },
  ): Promise<CompanyRecord> {
    const [existingCompany] = await transaction
      .select({
        id: companies.id,
        clerk_organization_id: companies.clerkOrganizationId,
        name: companies.name,
      })
      .from(companies)
      .where(eq(companies.clerkOrganizationId, params.providerSubject))
      .limit(1) as CompanyRecord[];
    if (existingCompany) {
      return existingCompany;
    }

    const [createdCompany] = await transaction
      .insert(companies)
      .values({
        clerkOrganizationId: params.providerSubject,
        name: params.name,
      })
      .returning?.({
        id: companies.id,
        clerk_organization_id: companies.clerkOrganizationId,
        name: companies.name,
      }) as Promise<CompanyRecord[]>;
    if (!createdCompany) {
      throw new Error("Failed to provision Clerk company.");
    }

    return createdCompany;
  }

  private async ensureMembership(
    transaction: AuthProviderDatabaseTransaction,
    params: {
      companyId: string;
      userId: string;
    },
  ): Promise<void> {
    const [existingMembership] = await transaction
      .select({
        companyId: companyMembers.companyId,
        userId: companyMembers.userId,
      })
      .from(companyMembers)
      .where(and(
        eq(companyMembers.companyId, params.companyId),
        eq(companyMembers.userId, params.userId),
      ))
      .limit(1) as Array<{ companyId: string; userId: string }>;

    if (existingMembership?.userId === params.userId) {
      return;
    }

    await transaction.insert(companyMembers).values({
      companyId: params.companyId,
      userId: params.userId,
    });
  }

  private resolveEmail(claims: Record<string, unknown>): string {
    const email = this.firstNonEmptyString([
      claims.email,
      claims.email_address,
      claims.primary_email,
      claims.primaryEmail,
    ]);
    if (!email) {
      throw new Error("Clerk bearer token is missing an email claim.");
    }

    return email;
  }

  private resolvePersonName(
    claims: Record<string, unknown>,
    email: string,
  ): {
    firstName: string;
    lastName: string | null;
  } {
    const firstNameClaim = this.firstNonEmptyString([
      claims.first_name,
      claims.firstName,
      claims.given_name,
    ]);
    const lastNameClaim = this.firstNonEmptyString([
      claims.last_name,
      claims.lastName,
      claims.family_name,
    ]);

    if (firstNameClaim) {
      return {
        firstName: firstNameClaim,
        lastName: lastNameClaim || null,
      };
    }

    const displayName = this.firstNonEmptyString([claims.name]);
    if (displayName) {
      const [firstName, ...rest] = displayName.split(/\s+/).filter(Boolean);
      if (firstName) {
        return {
          firstName,
          lastName: rest.length > 0 ? rest.join(" ") : null,
        };
      }
    }

    return {
      firstName: email.split("@")[0] || "User",
      lastName: null,
    };
  }

  private resolveOrganizationSubject(claims: Record<string, unknown>, orgId: string | null): string | null {
    const organizationClaims = this.resolveOrganizationClaims(claims);
    return this.firstNonEmptyString([
      orgId,
      organizationClaims?.id,
      claims.org_id,
    ]);
  }

  private static createClerkRequest(token: string, origin: string): Request {
    const requestUrl = new URL("/internal/authenticate", origin).toString();
    return new Request(requestUrl, {
      headers: new Headers({
        authorization: `Bearer ${token}`,
      }),
      method: "GET",
    });
  }

  private static verifyStatus(rawStatus: unknown): void {
    if (String(rawStatus || "").trim().toLowerCase() === "pending") {
      throw new Error("Clerk bearer token is pending organization activation.");
    }
  }

  private resolveOrganizationName(claims: Record<string, unknown>, organizationSubject: string): string {
    const organizationClaims = this.resolveOrganizationClaims(claims);
    return this.firstNonEmptyString([
      organizationClaims?.name,
      organizationClaims?.nam,
      claims.organization_name,
      claims.organizationName,
      claims.org_name,
      claims.orgName,
      organizationClaims?.slug,
      organizationClaims?.slg,
      claims.org_slug,
      organizationSubject,
    ]) || organizationSubject;
  }

  private resolveOrganizationClaims(claims: Record<string, unknown>): Record<string, unknown> | null {
    const organizationClaims = claims.o;
    if (!organizationClaims || typeof organizationClaims !== "object" || Array.isArray(organizationClaims)) {
      return null;
    }

    return organizationClaims as Record<string, unknown>;
  }

  private normalizeEmail(rawEmail: string): string {
    const normalizedEmail = String(rawEmail || "").trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Clerk bearer token is missing a valid email claim.");
    }

    return normalizedEmail;
  }

  private requireClaim(rawValue: unknown, errorMessage: string): string {
    const normalizedValue = String(rawValue || "").trim();
    if (!normalizedValue) {
      throw new Error(errorMessage);
    }

    return normalizedValue;
  }

  private firstNonEmptyString(rawValues: unknown[]): string | null {
    for (const rawValue of rawValues) {
      const normalizedValue = String(rawValue || "").trim();
      if (normalizedValue) {
        return normalizedValue;
      }
    }

    return null;
  }
}
