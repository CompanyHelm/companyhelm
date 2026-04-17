import { createClerkClient } from "@clerk/backend";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import type { DatabaseClientInterface } from "../../db/database_interface.ts";
import { CompanyBootstrapService } from "../../services/bootstrap/company.ts";
import { UserBootstrapService } from "../../services/bootstrap/user.ts";
import { CompanyHelmComputeProviderService } from "../../services/compute_provider_definitions/companyhelm_service.ts";
import { CompanyHelmLlmProviderService } from "../../services/ai_providers/companyhelm_service.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.ts";
import {
  AuthProvider,
  type AuthenticateBearerTokenHeaders,
  type AuthSession,
} from "../auth_provider.ts";
import { ClerkJwtKeyLoader } from "./clerk_jwt_key_loader.ts";

type ClerkBackendUser = {
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
  }>;
};

type ClerkAuthenticateRequestResult = {
  isAuthenticated: boolean;
  toAuth?(): {
    isAuthenticated: boolean;
    orgId?: string | null;
    sessionClaims?: Record<string, unknown>;
    userId?: string | null;
  };
};

type ClerkClientDependency = {
  authenticateRequest(...arguments_: unknown[]): Promise<ClerkAuthenticateRequestResult>;
  users: {
    getUser(userId: string): Promise<ClerkBackendUser>;
  };
};

type JwtKeyLoaderDependency = {
  load(token: string): Promise<unknown>;
};

/**
 * Verifies Clerk session tokens, resolves Clerk profile fields, and then hands local provisioning to
 * the dedicated bootstrap services so auth transport code stays focused on Clerk-specific concerns.
 */
@injectable()
export class ClerkAuthProvider extends AuthProvider {
  readonly name = "clerk" as const;
  private clerkClient: ClerkClientDependency;
  private jwtKeyLoader: JwtKeyLoaderDependency;
  private readonly companyBootstrapService: CompanyBootstrapService;
  private readonly config: NonNullable<Config["auth"]["clerk"]>;
  private readonly userBootstrapService: UserBootstrapService;

  constructor(
    @inject(Config) config: Config,
    @inject(UserBootstrapService) userBootstrapService: UserBootstrapService,
    @inject(CompanyBootstrapService) companyBootstrapService: CompanyBootstrapService,
  ) {
    super();
    this.config = config.auth.clerk;
    this.userBootstrapService = userBootstrapService;
    this.companyBootstrapService = companyBootstrapService;
    this.clerkClient = createClerkClient({
      secretKey: this.config.secret_key,
      publishableKey: this.config.publishable_key,
    }) as unknown as ClerkClientDependency;
    this.jwtKeyLoader = new ClerkJwtKeyLoader(config);
  }

  static createForTest(
    config: Config,
    dependencies: {
      clerkClient?: ClerkClientDependency;
      companyBootstrapService?: CompanyBootstrapService;
      jwtKeyLoader?: JwtKeyLoaderDependency;
      userBootstrapService?: UserBootstrapService;
    } = {},
  ): ClerkAuthProvider {
    const provider = new ClerkAuthProvider(
      config,
      dependencies.userBootstrapService ?? new UserBootstrapService(),
      dependencies.companyBootstrapService ?? new CompanyBootstrapService(
        new CompanyHelmComputeProviderService(config),
        new CompanyHelmLlmProviderService(config, new ModelRegistry()),
      ),
    );
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

    const authenticatedRequest = requestState.toAuth?.();
    if (!authenticatedRequest || !authenticatedRequest.isAuthenticated || !authenticatedRequest.sessionClaims) {
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
      const user = await this.userBootstrapService.findOrCreateUser(transaction, {
        loadUser: async () => {
          const clerkUser = await this.clerkClient.users.getUser(providerSubject) as ClerkBackendUser;
          const email = this.resolveClerkUserEmail(clerkUser);
          const { firstName, lastName } = this.resolveClerkUserName(clerkUser, email);

          return {
            email,
            firstName,
            lastName,
          };
        },
        providerSubject,
      });
      const company = await this.companyBootstrapService.findOrCreateCompany(transaction, {
        providerSubject: organizationSubject,
        name: organizationName,
      });
      await database.applyCompanyContext(
        transaction as DatabaseClientInterface,
        company.id,
      );
      await this.companyBootstrapService.ensureMembership(transaction, {
        companyId: company.id,
        userId: user.id,
      });
      await this.companyBootstrapService.ensureCompanyDefaults(transaction, company.id, {
        seedAgent: company.wasCreated,
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

  private resolveOrganizationSubject(
    claims: Record<string, unknown>,
    orgId: string | null | undefined,
  ): string | null {
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
