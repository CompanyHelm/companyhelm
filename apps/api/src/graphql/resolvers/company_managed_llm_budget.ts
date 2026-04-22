import { inject, injectable } from "inversify";
import {
  CompanyManagedLlmBudgetService,
  type CompanyManagedLlmBudgetSnapshot,
} from "../../services/ai_providers/company_managed_llm_budget_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type GraphqlCompanyManagedLlmBudgetPeriod = {
  exhausted: boolean;
  limitCostNanoUsd: number | null;
  overageCostNanoUsd: number;
  period: string;
  periodStart: string;
  remainingCostNanoUsd: number | null;
  usedCostNanoUsd: number;
};

type GraphqlCompanyManagedLlmBudget = {
  daily: GraphqlCompanyManagedLlmBudgetPeriod;
  managedCredentialId: string | null;
  monthly: GraphqlCompanyManagedLlmBudgetPeriod;
  plan: string;
};

/**
 * Exposes the same CompanyHelm-managed LLM budget snapshot used by enforcement so usage screens
 * can display plan caps, remaining included spend, and overage without duplicating pricing policy
 * in GraphQL resolvers or the web app.
 */
@injectable()
export class CompanyManagedLlmBudgetQueryResolver {
  private readonly companyManagedLlmBudgetService: CompanyManagedLlmBudgetService;

  constructor(
    @inject(CompanyManagedLlmBudgetService)
    companyManagedLlmBudgetService: CompanyManagedLlmBudgetService = new CompanyManagedLlmBudgetService(),
  ) {
    this.companyManagedLlmBudgetService = companyManagedLlmBudgetService;
  }

  execute = async (
    _root: unknown,
    _arguments: unknown,
    context: GraphqlRequestContext,
  ): Promise<GraphqlCompanyManagedLlmBudget> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const snapshot = await this.companyManagedLlmBudgetService.getBudgetSnapshot(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
      },
    );

    return this.serializeSnapshot(snapshot);
  };

  private serializeSnapshot(snapshot: CompanyManagedLlmBudgetSnapshot): GraphqlCompanyManagedLlmBudget {
    return {
      daily: this.serializePeriod(snapshot.daily),
      managedCredentialId: snapshot.managedCredentialId,
      monthly: this.serializePeriod(snapshot.monthly),
      plan: snapshot.plan,
    };
  }

  private serializePeriod(
    period: CompanyManagedLlmBudgetSnapshot["daily"],
  ): GraphqlCompanyManagedLlmBudgetPeriod {
    return {
      ...period,
      periodStart: period.periodStart.toISOString(),
    };
  }
}
