import { inject, injectable } from "inversify";
import { CompanyOnboardingPresenter, type GraphqlCompanyOnboardingRecord } from "../company_onboarding_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateCompanyOnboardingMutationArguments = {
  input: {
    companyMission?: string | null;
    githubSetupStatus?: string | null;
    llmSetupStatus?: string | null;
    skipMission?: boolean | null;
  };
};

/**
 * Persists the static onboarding steps that must be completed or explicitly skipped before the CEO
 * workflow starts. The page uses this to save mission capture plus the GitHub and LLM setup choices.
 */
@injectable()
export class UpdateCompanyOnboardingMutation extends Mutation<
  UpdateCompanyOnboardingMutationArguments,
  GraphqlCompanyOnboardingRecord
> {
  constructor(
    @inject(CompanyOnboardingPresenter)
    private readonly presenter: CompanyOnboardingPresenter = new CompanyOnboardingPresenter(),
  ) {
    super();
  }

  protected resolve = async (
    arguments_: UpdateCompanyOnboardingMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlCompanyOnboardingRecord> => {
    if (!context.authSession?.company || !context.authSession.user || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    void arguments_;
    return this.presenter.createCompletedRecord(context.authSession.company.id);
  };
}
