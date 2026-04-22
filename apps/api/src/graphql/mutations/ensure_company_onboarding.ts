import { inject, injectable } from "inversify";
import { CompanyOnboardingPresenter, type GraphqlCompanyOnboardingRecord } from "../company_onboarding_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { CompanyOnboardingService } from "../../services/onboarding/company_onboarding_service.ts";
import { Mutation } from "./mutation.ts";

/**
 * Idempotently starts the authenticated company's CEO onboarding chat when the app shell reaches a
 * newly provisioned company. Repeated calls return the existing onboarding chat instead of creating
 * competing workflow runs.
 */
@injectable()
export class EnsureCompanyOnboardingMutation extends Mutation<Record<string, never>, GraphqlCompanyOnboardingRecord> {
  constructor(
    @inject(CompanyOnboardingService)
    private readonly companyOnboardingService: CompanyOnboardingService = new CompanyOnboardingService(),
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

    return this.presenter.serialize(
      await this.companyOnboardingService.ensureOnboarding(context.app_runtime_transaction_provider, {
        companyId: context.authSession.company.id,
        userId: context.authSession.user.id,
      }),
    );
  };
}
