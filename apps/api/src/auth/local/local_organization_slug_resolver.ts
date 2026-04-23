import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { companies } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { OrganizationSlugResolver } from "../organization_slug_resolver.ts";

type CompanySlugRecord = {
  slug: string | null;
};

/**
 * Resolves the company slug from local database state for auth providers that do not delegate
 * organization identity to Clerk.
 */
@injectable()
export class LocalOrganizationSlugResolver extends OrganizationSlugResolver {
  async resolveForCompany(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<string> {
    const companySlug = await transactionProvider.transaction(async (tx) => {
      const [company] = await tx
        .select({
          slug: companies.slug,
        })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1) as CompanySlugRecord[];

      return company?.slug ?? null;
    });
    const resolvedCompanySlug = String(companySlug || "").trim();
    if (!resolvedCompanySlug) {
      throw new Error("Company is not linked to a local organization slug.");
    }

    return resolvedCompanySlug;
  }
}
