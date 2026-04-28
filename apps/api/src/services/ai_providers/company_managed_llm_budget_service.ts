import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { companies, llmUsageAggregates } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

export type CompanySubscriptionPlan = "free" | "pro";
type LlmUsageAggregatePeriod = "day" | "month";

type CompanyManagedLlmBudgetInput = {
  companyId: string;
  modelProviderCredentialId: string;
  now?: Date;
};

type PlatformManagedLlmBudgetInput = {
  companyId: string;
  now?: Date;
};

type CompanyManagedLlmBudgetSnapshotInput = {
  companyId: string;
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

export type CompanyManagedLlmBudgetPeriodSnapshot = {
  exhausted: boolean;
  limitCostNanoUsd: number | null;
  overageCostNanoUsd: number;
  period: LlmUsageAggregatePeriod;
  periodStart: Date;
  remainingCostNanoUsd: number | null;
  usedCostNanoUsd: number;
};

export type CompanyManagedLlmBudgetSnapshot = {
  daily: CompanyManagedLlmBudgetPeriodSnapshot;
  monthly: CompanyManagedLlmBudgetPeriodSnapshot;
  plan: CompanySubscriptionPlan;
};

type CompanyRecord = {
  plan: CompanySubscriptionPlan;
};

type UsageAggregateRecord = {
  totalCostNanoVirtualUsd: number;
};

type SelectableDatabase = {
  execute?(query: unknown): Promise<unknown>;
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
    void database;
    void input;
    return {
      allowed: true,
    };
  }

  async assertWithinPlatformBudgetInTransaction(
    database: SelectableDatabase,
    input: PlatformManagedLlmBudgetInput,
  ): Promise<void> {
    const status = await this.checkWithinPlatformBudgetInTransaction(database, input);
    if (!status.allowed) {
      throw new Error(status.message);
    }
  }

  async checkWithinPlatformBudgetInTransaction(
    database: SelectableDatabase,
    input: PlatformManagedLlmBudgetInput,
  ): Promise<CompanyManagedLlmBudgetStatus> {
    const company = await this.loadCompany(database, input.companyId);
    const entitlements = this.resolveEntitlements(company.plan);
    const now = input.now ?? new Date();
    const dayPeriodStart = this.resolveUtcDayPeriodStart(now);
    const monthPeriodStart = this.resolveUtcMonthPeriodStart(now);

    const dailyBudget = await this.loadPeriodBudget(database, {
      capNanoUsd: entitlements.dailyCapNanoUsd,
      companyId: input.companyId,
      period: "day",
      periodStart: dayPeriodStart,
    });
    if (dailyBudget.exhausted) {
      return this.toBudgetLimitStatus(dailyBudget);
    }

    const monthlyBudget = await this.loadPeriodBudget(database, {
      capNanoUsd: entitlements.monthlyCapNanoUsd,
      companyId: input.companyId,
      period: "month",
      periodStart: monthPeriodStart,
    });
    if (monthlyBudget.exhausted) {
      return this.toBudgetLimitStatus(monthlyBudget);
    }

    return {
      allowed: true,
    };
  }

  async getBudgetSnapshot(
    transactionProvider: TransactionProviderInterface,
    input: CompanyManagedLlmBudgetSnapshotInput,
  ): Promise<CompanyManagedLlmBudgetSnapshot> {
    return transactionProvider.transaction(async (tx) => {
      return this.getBudgetSnapshotInTransaction(tx as unknown as SelectableDatabase, input);
    });
  }

  async getBudgetSnapshotInTransaction(
    database: SelectableDatabase,
    input: CompanyManagedLlmBudgetSnapshotInput,
  ): Promise<CompanyManagedLlmBudgetSnapshot> {
    const company = await this.loadCompany(database, input.companyId);
    const entitlements = this.resolveEntitlements(company.plan);
    const now = input.now ?? new Date();
    const dailyPeriodStart = this.resolveUtcDayPeriodStart(now);
    const monthlyPeriodStart = this.resolveUtcMonthPeriodStart(now);

    return {
      daily: await this.loadOptionalCredentialPeriodBudget(database, {
        capNanoUsd: entitlements.dailyCapNanoUsd,
        companyId: input.companyId,
        period: "day",
        periodStart: dailyPeriodStart,
      }),
      monthly: await this.loadOptionalCredentialPeriodBudget(database, {
        capNanoUsd: entitlements.monthlyCapNanoUsd,
        companyId: input.companyId,
        period: "month",
        periodStart: monthlyPeriodStart,
      }),
      plan: company.plan,
    };
  }

  private async loadPeriodBudget(
    database: SelectableDatabase,
    input: {
      capNanoUsd: number | null;
      companyId: string;
      period: LlmUsageAggregatePeriod;
      periodStart: Date;
    },
  ): Promise<CompanyManagedLlmBudgetPeriodSnapshot> {
    const usedCostNanoUsd = await this.loadPeriodCostNanoUsd(database, input);
    return this.buildPeriodSnapshot(input.period, input.periodStart, input.capNanoUsd, usedCostNanoUsd);
  }

  private async loadOptionalCredentialPeriodBudget(
    database: SelectableDatabase,
    input: {
      capNanoUsd: number | null;
      companyId: string;
      period: LlmUsageAggregatePeriod;
      periodStart: Date;
    },
  ): Promise<CompanyManagedLlmBudgetPeriodSnapshot> {
    return this.loadPeriodBudget(database, input);
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
      period: LlmUsageAggregatePeriod;
      periodStart: Date;
    },
  ): Promise<number> {
    const [aggregate] = await database
      .select({
        totalCostNanoVirtualUsd: llmUsageAggregates.totalCostNanoVirtualUsd,
      })
      .from(llmUsageAggregates)
      .where(and(
        eq(llmUsageAggregates.companyId, input.companyId),
        eq(llmUsageAggregates.scopeType, "managed_model_provider_credential"),
        eq(llmUsageAggregates.period, input.period),
        eq(llmUsageAggregates.periodStart, input.periodStart),
      )) as UsageAggregateRecord[];

    return aggregate?.totalCostNanoVirtualUsd ?? 0;
  }

  private resolveEntitlements(plan: CompanySubscriptionPlan): CompanyManagedLlmBudgetEntitlements {
    return CompanyManagedLlmBudgetService.entitlementsByPlan[plan];
  }

  private buildPeriodSnapshot(
    period: LlmUsageAggregatePeriod,
    periodStart: Date,
    limitCostNanoUsd: number | null,
    usedCostNanoUsd: number,
  ): CompanyManagedLlmBudgetPeriodSnapshot {
    if (limitCostNanoUsd === null) {
      return {
        exhausted: false,
        limitCostNanoUsd,
        overageCostNanoUsd: 0,
        period,
        periodStart,
        remainingCostNanoUsd: null,
        usedCostNanoUsd,
      };
    }

    return {
      exhausted: usedCostNanoUsd >= limitCostNanoUsd,
      limitCostNanoUsd,
      overageCostNanoUsd: Math.max(usedCostNanoUsd - limitCostNanoUsd, 0),
      period,
      periodStart,
      remainingCostNanoUsd: Math.max(limitCostNanoUsd - usedCostNanoUsd, 0),
      usedCostNanoUsd,
    };
  }

  private toBudgetLimitStatus(periodBudget: CompanyManagedLlmBudgetPeriodSnapshot): CompanyManagedLlmBudgetStatus {
    if (periodBudget.limitCostNanoUsd === null) {
      return {
        allowed: true,
      };
    }

    return {
      allowed: false,
      limitCostNanoUsd: periodBudget.limitCostNanoUsd,
      message: this.resolveLimitMessage(periodBudget.period),
      period: periodBudget.period,
      periodStart: periodBudget.periodStart,
      usedCostNanoUsd: periodBudget.usedCostNanoUsd,
    };
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
