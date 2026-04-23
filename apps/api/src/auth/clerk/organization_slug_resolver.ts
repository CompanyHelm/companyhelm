import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { companies } from "../../db/schema.ts";
import { OrganizationSlugResolver } from "../organization_slug_resolver.ts";

type ClerkOrganizationRecord = {
  slug: string | null;
};

type ClerkOrganizationClient = {
  organizations: {
    getOrganization(params: {
      organizationId: string;
    }): Promise<ClerkOrganizationRecord>;
  };
};

type CompanyClerkOrganizationRecord = {
  clerkOrganizationId: string | null;
};

/**
 * Resolves the current organization slug directly from Clerk for flows that need to build
 * org-scoped return URLs but should not depend on user-provided route parameters.
 */
@injectable()
export class ClerkOrganizationSlugResolver extends OrganizationSlugResolver {
  private readonly config: Extract<Config["auth"], {
    provider: "clerk";
  }>;
  private clerkClient: ClerkOrganizationClient | null = null;

  constructor(@inject(Config) config: Config) {
    super();
    if (config.auth.provider !== "clerk") {
      throw new Error("Clerk organization slug resolver requires Clerk auth configuration.");
    }

    this.config = config.auth;
  }

  static createForTest(
    config: Config,
    clerkClient: ClerkOrganizationClient,
  ): ClerkOrganizationSlugResolver {
    const resolver = new ClerkOrganizationSlugResolver(config);
    resolver.clerkClient = clerkClient;
    return resolver;
  }

  async resolveForCompany(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<string> {
    const clerkOrganizationId = await this.loadClerkOrganizationId(transactionProvider, companyId);
    const organization = await this.getClerkClient().organizations.getOrganization({
      organizationId: clerkOrganizationId,
    });
    const organizationSlug = String(organization.slug || "").trim();
    if (!organizationSlug) {
      throw new Error("Clerk organization slug is required to build CompanyHelm organization URLs.");
    }

    return organizationSlug;
  }

  private getClerkClient(): ClerkOrganizationClient {
    if (!this.clerkClient) {
      this.clerkClient = createClerkClient({
        publishableKey: this.config.clerk.publishable_key,
        secretKey: this.config.clerk.secret_key,
      }) as unknown as ClerkOrganizationClient;
    }

    return this.clerkClient;
  }

  private async loadClerkOrganizationId(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<string> {
    const clerkOrganizationId = await transactionProvider.transaction(async (tx) => {
      const [company] = await tx
        .select({
          clerkOrganizationId: companies.clerkOrganizationId,
        })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1) as CompanyClerkOrganizationRecord[];

      return company?.clerkOrganizationId ?? null;
    });
    const resolvedClerkOrganizationId = String(clerkOrganizationId || "").trim();
    if (!resolvedClerkOrganizationId) {
      throw new Error("Company is not linked to a Clerk organization.");
    }

    return resolvedClerkOrganizationId;
  }
}
