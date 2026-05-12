import { inject, injectable } from "inversify";
import { CompanyOnboardingPresenter, type GraphqlCompanyOnboardingRecord } from "../company_onboarding_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

/**
 * Records a deliberate company-level onboarding skip without deleting the CEO chat or workflow
 * history, which lets the product distinguish an intentional bypass from a completed setup.
 */
@injectable()
export class SkipCompanyOnboardingMutation extends Mutation<Record<string, never>, GraphqlCompanyOnboardingRecord> {
  constructor(
    @inject(CompanyOnboardingPresenter)
    private readonly presenter: CompanyOnboardingPresenter = new CompanyOnboardingPresenter(),
  ) {
    super();
  }

  protected resolve = async (
    _arguments: Record<string, never>,
    context: GraphqlRequestContext,
  ): Promise<GraphqlCompanyOnboardingRecord> => {
    if (!context.authSession?.company || !context.authSession.user || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return this.presenter.createCompletedRecord(context.authSession.company.id);
  };
}
