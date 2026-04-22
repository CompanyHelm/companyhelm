import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { companies, llmUsageAggregates, modelProviderCredentials } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

type CompanySubscriptionPlan = "free" | "pro";
type LlmUsageAggregatePeriod = "day" | "month";

type CompanyManagedLlmBudgetInput = {
  companyId: string;
  modelProviderCredentialId: string;
  now?: Date;
};

type CompanyManagedLlmBudgetEntitlements = {
  dailyCapNanoUsd: number | null;
  monthlyCapNanoUsd: number | null;
};

export type CompanyManagedLlmBudgetStatus = {
  allowed: true;
} | {
  allowed: false;
  limitCostNanoUsd: number;
  message: string;
  period: LlmUsageAggregatePeriod;
  periodStart: Date;
  usedCostNanoUsd: number;
};

type CredentialRecord = {
  isManaged: boolean;
};

type CompanyRecord = {
  plan: CompanySubscriptionPlan;
};

type UsageAggregateRecord = {
  totalCostNanoUsd: number;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Enforces the CompanyHelm-managed LLM allowance derived from the company's plan. The service keeps
 * the first quota implementation intentionally simple by using already-recorded provider usage
 * aggregates, which means active in-flight turns can overspend slightly while still preventing new
 * managed-provider work once daily or monthly caps are reached.
 */
@injectable()
export class CompanyManagedLlmBudgetService {
  private static readonly nanoUsdPerUsd = 1_000_000_000;
  private static readonly entitlementsByPlan: Record<CompanySubscriptionPlan, CompanyManagedLlmBudgetEntitlements> = {
    free: {
      dailyCapNanoUsd: 2 * CompanyManagedLlmBudgetService.nanoUsdPerUsd,
      monthlyCapNanoUsd: 10 * CompanyManagedLlmBudgetService.nanoUsdPerUsd,
    },
    pro: {
      dailyCapNanoUsd: 20 * CompanyManagedLlmBudgetService.nanoUsdPerUsd,
      monthlyCapNanoUsd: 100 * CompanyManagedLlmBudgetService.nanoUsdPerUsd,
    },
  };

  async assertWithinBudget(
    transactionProvider: TransactionProviderInterface,
    input: CompanyManagedLlmBudgetInput,
  ): Promise<void> {
    const status = await this.checkWithinBudget(transactionProvider, input);
    if (!status.allowed) {
      throw new Error(status.message);
    }
  }

  async checkWithinBudget(
    transactionProvider: TransactionProviderInterface,
    input: CompanyManagedLlmBudgetInput,
  ): Promise<CompanyManagedLlmBudgetStatus> {
    return transactionProvider.transaction(async (tx) => {
      return this.checkWithinBudgetInTransaction(tx as unknown as SelectableDatabase, input);
    });
  }

  async assertWithinBudgetInTransaction(
    database: SelectableDatabase,
    input: CompanyManagedLlmBudgetInput,
  ): Promise<void> {
    const status = await this.checkWithinBudgetInTransaction(database, input);
    if (!status.allowed) {
      throw new Error(status.message);
    }
  }

  async checkWithinBudgetInTransaction(
    database: SelectableDatabase,
    input: CompanyManagedLlmBudgetInput,
  ): Promise<CompanyManagedLlmBudgetStatus> {
    const credential = await this.loadCredential(database, input.companyId, input.modelProviderCredentialId);
    if (!credential.isManaged) {
      return {
        allowed: true,
      };
    }

    const company = await this.loadCompany(database, input.companyId);
    const entitlements = this.resolveEntitlements(company.plan);
    const now = input.now ?? new Date();
    const dayPeriodStart = this.resolveUtcDayPeriodStart(now);
    const monthPeriodStart = this.resolveUtcMonthPeriodStart(now);

    const dailyStatus = await this.checkPeriodBudget(database, {
      capNanoUsd: entitlements.dailyCapNanoUsd,
      companyId: input.companyId,
      modelProviderCredentialId: input.modelProviderCredentialId,
      period: "day",
      periodStart: dayPeriodStart,
    });
    if (!dailyStatus.allowed) {
      return dailyStatus;
    }

    return this.checkPeriodBudget(database, {
      capNanoUsd: entitlements.monthlyCapNanoUsd,
      companyId: input.companyId,
      modelProviderCredentialId: input.modelProviderCredentialId,
      period: "month",
      periodStart: monthPeriodStart,
    });
  }

  private async checkPeriodBudget(
    database: SelectableDatabase,
    input: {
      capNanoUsd: number | null;
      companyId: string;
      modelProviderCredentialId: string;
      period: LlmUsageAggregatePeriod;
      periodStart: Date;
    },
  ): Promise<CompanyManagedLlmBudgetStatus> {
    if (input.capNanoUsd === null) {
      return {
        allowed: true,
      };
    }

    const usedCostNanoUsd = await this.loadPeriodCostNanoUsd(database, input);
    if (usedCostNanoUsd < input.capNanoUsd) {
      return {
        allowed: true,
      };
    }

    return {
      allowed: false,
      limitCostNanoUsd: input.capNanoUsd,
      message: this.resolveLimitMessage(input.period),
      period: input.period,
      periodStart: input.periodStart,
      usedCostNanoUsd,
    };
  }

  private async loadCredential(
    database: SelectableDatabase,
    companyId: string,
    modelProviderCredentialId: string,
  ): Promise<CredentialRecord> {
    const [credential] = await database
      .select({
        isManaged: modelProviderCredentials.isManaged,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.id, modelProviderCredentialId),
      )) as CredentialRecord[];
    if (!credential) {
      throw new Error("Model provider credential not found.");
    }

    return credential;
  }

  private async loadCompany(
    database: SelectableDatabase,
    companyId: string,
  ): Promise<CompanyRecord> {
    const [company] = await database
      .select({
        plan: companies.plan,
      })
      .from(companies)
      .where(eq(companies.id, companyId)) as CompanyRecord[];
    if (!company) {
      throw new Error("Company not found.");
    }

    return company;
  }

  private async loadPeriodCostNanoUsd(
    database: SelectableDatabase,
    input: {
      companyId: string;
      modelProviderCredentialId: string;
      period: LlmUsageAggregatePeriod;
      periodStart: Date;
    },
  ): Promise<number> {
    const [aggregate] = await database
      .select({
        totalCostNanoUsd: llmUsageAggregates.totalCostNanoUsd,
      })
      .from(llmUsageAggregates)
      .where(and(
        eq(llmUsageAggregates.companyId, input.companyId),
        eq(llmUsageAggregates.scopeType, "provider"),
        eq(llmUsageAggregates.scopeId, input.modelProviderCredentialId),
        eq(llmUsageAggregates.period, input.period),
        eq(llmUsageAggregates.periodStart, input.periodStart),
      )) as UsageAggregateRecord[];

    return aggregate?.totalCostNanoUsd ?? 0;
  }

  private resolveEntitlements(plan: CompanySubscriptionPlan): CompanyManagedLlmBudgetEntitlements {
    return CompanyManagedLlmBudgetService.entitlementsByPlan[plan];
  }

  private resolveLimitMessage(period: LlmUsageAggregatePeriod): string {
    if (period === "day") {
      return "CompanyHelm daily AI usage limit reached for this company.";
    }

    return "CompanyHelm monthly AI usage limit reached for this company.";
  }

  private resolveUtcDayPeriodStart(recordedAt: Date): Date {
    return new Date(Date.UTC(
      recordedAt.getUTCFullYear(),
      recordedAt.getUTCMonth(),
      recordedAt.getUTCDate(),
    ));
  }

  private resolveUtcMonthPeriodStart(recordedAt: Date): Date {
    return new Date(Date.UTC(recordedAt.getUTCFullYear(), recordedAt.getUTCMonth(), 1));
  }
}
