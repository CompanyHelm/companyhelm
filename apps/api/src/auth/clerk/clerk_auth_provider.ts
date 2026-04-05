import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import type {
  DatabaseClientInterface,
  DatabaseTransactionInterface,
} from "../../db/database_interface.ts";
import { companies, companyMembers, computeProviderDefinitions, users } from "../../db/schema.ts";
import { CompanyHelmComputeProviderService } from "../../services/compute_provider_definitions/companyhelm_service.ts";
import {
  AuthProvider,
  type AuthenticateBearerTokenHeaders,
  type AuthSession,
} from "../auth_provider.ts";
import { ClerkJwtKeyLoader } from "./clerk_jwt_key_loader.ts";

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

type ClerkBackendUser = {
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
  }>;
};

/**
 * Verifies Clerk session tokens and lazily provisions local user, company, and membership records.
 */
@injectable()
export class ClerkAuthProvider extends AuthProvider {
  readonly name = "clerk" as const;
  private clerkClient: Pick<ReturnType<typeof createClerkClient>, "authenticateRequest" | "users">;
  private jwtKeyLoader: Pick<ClerkJwtKeyLoader, "load">;
  private readonly config: NonNullable<Config["auth"]["clerk"]>;

  constructor(@inject(Config) config: Config) {
    super();
    this.config = config.auth.clerk;
    this.clerkClient = createClerkClient({
      secretKey: this.config.secret_key,
      publishableKey: this.config.publishable_key,
    });
    this.jwtKeyLoader = new ClerkJwtKeyLoader(config);
  }

  static createForTest(
    config: Config,
    dependencies: {
      clerkClient?: Pick<ReturnType<typeof createClerkClient>, "authenticateRequest" | "users">;
      jwtKeyLoader?: Pick<ClerkJwtKeyLoader, "load">;
    } = {},
  ): ClerkAuthProvider {
    const provider = new ClerkAuthProvider(config);
    provider.clerkClient = dependencies.clerkClient ?? provider.clerkClient;
    provider.jwtKeyLoader = dependencies.jwtKeyLoader ?? provider.jwtKeyLoader;
    return provider;
  }

  async authenticateBearerToken(
    database: AppRuntimeDatabase,
    token: string,
    headers: AuthenticateBearerTokenHeaders = {},
  ): Promise<AuthSession> {
    void headers;
    const db = database.getDatabase();
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    const jwtKey = await this.jwtKeyLoader.load(token);
    const requestState = await this.clerkClient.authenticateRequest(
      ClerkAuthProvider.createClerkRequest(token, this.config.authorized_parties[0]),
      {
        authorizedParties: this.config.authorized_parties,
        jwtKey,
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
    const organizationSubject = this.resolveOrganizationSubject(claims, authenticatedRequest.orgId);
    if (!organizationSubject) {
      throw new Error("Clerk bearer token is missing an active organization claim.");
    }

    const organizationName = this.resolveOrganizationName(claims, organizationSubject);

    return db.transaction(async (transaction) => {
      const user = await this.findOrCreateUser(transaction, providerSubject);
      const company = await this.findOrCreateCompany(transaction, {
        providerSubject: organizationSubject,
        name: organizationName,
      });
      await database.applyCompanyContext(
        transaction as DatabaseClientInterface,
        company.id,
      );
      await this.ensureCompanyHelmComputeProviderDefinition(transaction, company.id);
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
    transaction: DatabaseTransactionInterface,
    providerSubject: string,
  ): Promise<UserRecord> {
    const existingUser = await this.findUserByColumn(
      transaction,
      users.clerkUserId,
      providerSubject,
    );
    if (existingUser) {
      return existingUser;
    }

    const clerkUser = await this.clerkClient.users.getUser(providerSubject) as ClerkBackendUser;
    const email = this.resolveClerkUserEmail(clerkUser);
    const { firstName, lastName } = this.resolveClerkUserName(clerkUser, email);
    const existingUserByEmail = await this.findUserByColumn(
      transaction,
      users.email,
      email,
    );
    if (existingUserByEmail) {
      return existingUserByEmail;
    }

    const now = new Date();
    const [createdUser] = await transaction
      .insert(users)
      .values({
        clerkUserId: providerSubject,
        email,
        first_name: firstName,
        last_name: lastName,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoNothing()
      .returning?.({
        id: users.id,
        clerk_user_id: users.clerkUserId,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
      }) as Promise<UserRecord[]>;
    if (createdUser) {
      return createdUser;
    }

    const concurrentUser = await this.findUserByColumn(
      transaction,
      users.clerkUserId,
      providerSubject,
    ) ?? await this.findUserByColumn(
      transaction,
      users.email,
      email,
    );
    if (!concurrentUser) {
      throw new Error("Failed to provision Clerk user after duplicate insert.");
    }

    return concurrentUser;
  }

  private async findUserByColumn(
    transaction: DatabaseTransactionInterface,
    column: unknown,
    value: string,
  ): Promise<UserRecord | null> {
    const [existingUser] = await transaction
      .select({
        id: users.id,
        clerk_user_id: users.clerkUserId,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
      })
      .from(users)
      .where(eq(column as never, value))
      .limit(1) as UserRecord[];

    return existingUser ?? null;
  }

  private async findOrCreateCompany(
    transaction: DatabaseTransactionInterface,
    params: {
      providerSubject: string;
      name: string;
    },
  ): Promise<CompanyRecord> {
    const existingCompany = await this.findCompanyByClerkOrganizationId(
      transaction,
      params.providerSubject,
    );
    if (existingCompany) {
      return existingCompany;
    }

    const [createdCompany] = await transaction
      .insert(companies)
      .values({
        clerkOrganizationId: params.providerSubject,
        name: params.name,
      })
      .onConflictDoNothing()
      .returning?.({
        id: companies.id,
        clerk_organization_id: companies.clerkOrganizationId,
        name: companies.name,
      }) as Promise<CompanyRecord[]>;
    if (!createdCompany) {
      const concurrentCompany = await this.findCompanyByClerkOrganizationId(
        transaction,
        params.providerSubject,
      );
      if (!concurrentCompany) {
        throw new Error("Failed to provision Clerk company.");
      }

      return concurrentCompany;
    }

    return createdCompany;
  }

  private async findCompanyByClerkOrganizationId(
    transaction: DatabaseTransactionInterface,
    providerSubject: string,
  ): Promise<CompanyRecord | null> {
    const [existingCompany] = await transaction
      .select({
        id: companies.id,
        clerk_organization_id: companies.clerkOrganizationId,
        name: companies.name,
      })
      .from(companies)
      .where(eq(companies.clerkOrganizationId, providerSubject))
      .limit(1) as CompanyRecord[];

    return existingCompany ?? null;
  }

  private async ensureMembership(
    transaction: DatabaseTransactionInterface,
    params: {
      companyId: string;
      userId: string;
    },
  ): Promise<void> {
    await transaction
      .insert(companyMembers)
      .values({
        companyId: params.companyId,
        userId: params.userId,
      })
      .onConflictDoNothing();
  }

  private async ensureCompanyHelmComputeProviderDefinition(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<void> {
    const now = new Date();
    await transaction
      .insert(computeProviderDefinitions)
      .values({
        companyId,
        createdAt: now,
        createdByUserId: null,
        description: CompanyHelmComputeProviderService.DEFINITION_DESCRIPTION,
        name: CompanyHelmComputeProviderService.DEFINITION_NAME,
        provider: "e2b",
        updatedAt: now,
        updatedByUserId: null,
      })
      .onConflictDoNothing();
  }

  private resolveClerkUserEmail(clerkUser: ClerkBackendUser): string {
    const primaryEmailAddressId = this.firstNonEmptyString([clerkUser.primaryEmailAddressId]);
    const primaryEmailAddress = primaryEmailAddressId
      ? clerkUser.emailAddresses.find((emailAddress) => emailAddress.id === primaryEmailAddressId)?.emailAddress
      : null;
    const email = this.firstNonEmptyString([
      primaryEmailAddress,
      clerkUser.emailAddresses[0]?.emailAddress,
    ]);
    if (!email) {
      throw new Error("Clerk user is missing an email address.");
    }

    return this.normalizeEmail(email);
  }

  private resolveClerkUserName(
    clerkUser: ClerkBackendUser,
    email: string,
  ): {
    firstName: string;
    lastName: string | null;
  } {
    const firstNameClaim = this.firstNonEmptyString([
      clerkUser.firstName,
    ]);
    const lastNameClaim = this.firstNonEmptyString([
      clerkUser.lastName,
    ]);

    if (firstNameClaim) {
      return {
        firstName: firstNameClaim,
        lastName: lastNameClaim || null,
      };
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
