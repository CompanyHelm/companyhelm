import { inject, injectable } from "inversify";
import { CompanySettingsService } from "../../services/company_settings_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateCompanySettingsMutationArguments = {
  input: {
    baseSystemPrompt?: string | null;
  };
};

type GraphqlCompanySettingsRecord = {
  companyId: string;
  baseSystemPrompt: string | null;
};

/**
 * Rewrites the authenticated company's shared prompt layer so every agent session can inherit the
 * same base operating instructions without modifying the static product prompt template.
 */
@injectable()
export class UpdateCompanySettingsMutation extends Mutation<
  UpdateCompanySettingsMutationArguments,
  GraphqlCompanySettingsRecord
> {
  private readonly companySettingsService: CompanySettingsService;

  constructor(
    @inject(CompanySettingsService)
    companySettingsService: CompanySettingsService = new CompanySettingsService(),
  ) {
    super();
    this.companySettingsService = companySettingsService;
  }

  protected resolve = async (
    arguments_: UpdateCompanySettingsMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlCompanySettingsRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return this.companySettingsService.updateSettings(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        baseSystemPrompt: arguments_.input.baseSystemPrompt,
      },
    );
  };
}
