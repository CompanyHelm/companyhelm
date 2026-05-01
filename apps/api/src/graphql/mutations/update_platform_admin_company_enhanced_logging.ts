import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { companies } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import {
  EnhancedLoggingAdminService,
  type EnhancedLoggingAdminCompanyState,
} from "../../log/enhanced_logging_admin_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdatePlatformAdminCompanyEnhancedLoggingMutationArguments = {
  input: {
    companyId: string;
    components?: string[] | null;
    enabled: boolean;
    sessionIds?: string[] | null;
    ttlSeconds?: number | null;
  };
};

type CompanyLookupRow = {
  id: string;
};

/**
 * Lets CompanyHelm platform admins turn short-lived enhanced diagnostics on or off for a target
 * company without requiring direct Redis access or risking an unbounded logging window.
 */
@injectable()
export class UpdatePlatformAdminCompanyEnhancedLoggingMutation extends Mutation<
  UpdatePlatformAdminCompanyEnhancedLoggingMutationArguments,
  EnhancedLoggingAdminCompanyState
> {
  private readonly enhancedLoggingAdminService: EnhancedLoggingAdminService;

  constructor(
    @inject(EnhancedLoggingAdminService)
    enhancedLoggingAdminService: EnhancedLoggingAdminService = new EnhancedLoggingAdminService(),
  ) {
    super();
    this.enhancedLoggingAdminService = enhancedLoggingAdminService;
  }

  protected resolve = async (
    arguments_: UpdatePlatformAdminCompanyEnhancedLoggingMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<EnhancedLoggingAdminCompanyState> => {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }

    await this.ensureCompanyExists(transactionProvider, arguments_.input.companyId);
    if (!arguments_.input.enabled) {
      return this.enhancedLoggingAdminService.disableCompany(arguments_.input.companyId);
    }

    const ttlSeconds = arguments_.input.ttlSeconds;
    if (typeof ttlSeconds !== "number") {
      throw new Error("TTL is required when enhanced logging is enabled.");
    }
    this.enhancedLoggingAdminService.validateTtlSeconds(ttlSeconds);

    return this.enhancedLoggingAdminService.enableCompany({
      companyId: arguments_.input.companyId,
      components: arguments_.input.components,
      sessionIds: arguments_.input.sessionIds,
      ttlSeconds,
    });
  };

  private async ensureCompanyExists(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      const companyRows = await tx
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1) as CompanyLookupRow[];
      if (!companyRows[0]) {
        throw new Error("Company not found.");
      }
    });
  }
}
