import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";

/**
 * Resolves the URL slug for a company when server-side flows need to build org-scoped CompanyHelm
 * URLs without relying on user-provided route parameters.
 */
export abstract class OrganizationSlugResolver {
  abstract resolveForCompany(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<string>;
}
