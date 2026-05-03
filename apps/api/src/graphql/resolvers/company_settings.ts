import { inject, injectable } from "inversify";
import { CompanySettingsService } from "../../services/company_settings_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type GraphqlCompanySettingsRecord = {
  companyId: string;
  baseSystemPrompt: string | null;
};

/**
 * Loads the authenticated company's shared agent prompt settings so the settings page and agent
 * detail view can explain the inherited prompt layer without duplicating persistence logic.
 */
@injectable()
export class CompanySettingsQueryResolver extends Resolver<GraphqlCompanySettingsRecord> {
  private readonly companySettingsService: CompanySettingsService;

  constructor(
    @inject(CompanySettingsService)
    companySettingsService: CompanySettingsService = new CompanySettingsService(),
  ) {
    super();
    this.companySettingsService = companySettingsService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlCompanySettingsRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return this.companySettingsService.getSettings(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );
  };
}
