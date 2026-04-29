import { inject, injectable } from "inversify";
import {
  CompanyCreationService,
  type FreeCompanyCreationEligibility,
} from "../../services/company_creation/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

/**
 * Reports whether the signed-in user can create another free company before the UI presents the
 * creation form, while leaving the mutation to repeat the same check under a transaction lock.
 */
@injectable()
export class FreeCompanyCreationEligibilityQueryResolver extends Resolver<FreeCompanyCreationEligibility> {
  private readonly companyCreationService: CompanyCreationService;

  constructor(
    @inject(CompanyCreationService)
    companyCreationService: CompanyCreationService,
  ) {
    super();
    this.companyCreationService = companyCreationService;
  }

  protected resolve = async (
    context: GraphqlRequestContext,
  ): Promise<FreeCompanyCreationEligibility> => {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }

    return this.companyCreationService.getFreeCompanyCreationEligibility(context.authSession.user.id);
  };
}
