import { injectable } from "inversify";
import { CompanyBillingPlanCatalog } from "../../services/company_billing_plan_catalog.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

/**
 * Publishes the server-owned billing catalog to authenticated UI surfaces so checkout buttons and
 * plan descriptions use the same source as wallet recharge accounting.
 */
@injectable()
export class BillingPlansQueryResolver {
  private readonly planCatalog: CompanyBillingPlanCatalog;

  constructor(planCatalog: CompanyBillingPlanCatalog = new CompanyBillingPlanCatalog()) {
    this.planCatalog = planCatalog;
  }

  execute = (
    _root: unknown,
    _arguments: unknown,
    context: GraphqlRequestContext,
  ) => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }

    return this.planCatalog.listPlans();
  };
}
