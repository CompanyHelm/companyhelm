import { inject, injectable } from "inversify";
import { CompanyOnboardingPresenter, type GraphqlCompanyOnboardingRecord } from "../company_onboarding_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type AuthenticatedCompanyParent = {
  id: string;
};

/**
 * Resolves onboarding only when clients explicitly request `Me.company.onboarding`, keeping the
 * common `Me` query path free from an extra table read for pages that do not need shell gating.
 */
@injectable()
export class CompanyOnboardingFieldResolver {
  constructor(
    @inject(CompanyOnboardingPresenter)
    private readonly presenter: CompanyOnboardingPresenter = new CompanyOnboardingPresenter(),
  ) {}

  execute = async (
    parent: AuthenticatedCompanyParent,
    _arguments: Record<string, never>,
    context: GraphqlRequestContext,
  ): Promise<GraphqlCompanyOnboardingRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (parent.id !== context.authSession.company.id) {
      throw new Error("Company onboarding is only available for the authenticated company.");
    }

    return this.presenter.createCompletedRecord(context.authSession.company.id);
  };
}
