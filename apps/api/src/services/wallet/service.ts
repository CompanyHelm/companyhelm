import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { injectable } from "inversify";
import { companies, walletTransactions, wallets } from "../../db/schema.ts";
import type { DatabaseInterface } from "../../db/database_interface.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

export type CompanyWalletSubscriptionPlan = "free" | "pro";

type WalletType = "subscription" | "pay_as_you_go";
type WalletTransactionCategory = "llm_charge" | "monthly_recharge" | "adjustment" | "opening";

type CompanyWalletRecord = {
  amountNanoUsd: number;
  companyId: string;
  id: string;
  type: WalletType;
};

type CompanyWalletTransactionRecord = {
  amountNanoUsd: number;
  category: WalletTransactionCategory;
  companyId: string;
  periodEnd: Date | null;
  periodStart: Date | null;
  sessionTurnId: string | null;
  walletId: string;
};

type CompanyPlanRecord = {
  id: string;
  pendingPlan: CompanyWalletSubscriptionPlan | null;
  pendingPlanEffectiveAt: Date | null;
  plan: CompanyWalletSubscriptionPlan;
};

type SelectableDatabase = {
  execute?(query: unknown): Promise<unknown>;
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>> | {
        limit(limit: number): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      onConflictDoNothing?(): {
        returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      } | Promise<unknown>;
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  execute?(query: unknown): Promise<unknown>;
  update?(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

export type CompanyWalletBalanceStatus = {
  allowed: boolean;
  balanceNanoUsd: number;
  message?: string;
};

export type SubscriptionPeriod = {
  periodEnd: Date;
  periodStart: Date;
};

/**
 * Owns company wallet accounting for CompanyHelm-managed model usage. The service keeps wallet
 * balance as the enforcement source of truth while using wallet transactions as an idempotent audit
 * ledger for opening credits, monthly subscription recharges, adjustments, and managed LLM charges.
 */
@injectable()
export class CompanyWalletService {
  private static readonly nanoUsdPerUsd = 1_000_000_000;
  private static readonly depletedMessage = "CompanyHelm AI wallet balance is depleted for this company.";
  private static readonly monthlyRechargeByPlan: Record<CompanyWalletSubscriptionPlan, number> = {
    free: 10 * CompanyWalletService.nanoUsdPerUsd,
    pro: 100 * CompanyWalletService.nanoUsdPerUsd,
  };

  async assertCompanyHasPositiveBalance(
    transactionProvider: TransactionProviderInterface,
    input: { companyId: string },
  ): Promise<void> {
    const status = await this.checkCompanyHasPositiveBalance(transactionProvider, input);
    if (!status.allowed) {
      throw new Error(status.message ?? CompanyWalletService.depletedMessage);
    }
  }

  async checkCompanyHasPositiveBalance(
    transactionProvider: TransactionProviderInterface,
    input: { companyId: string },
  ): Promise<CompanyWalletBalanceStatus> {
    return transactionProvider.transaction(async (tx) => {
      return this.checkCompanyHasPositiveBalanceInTransaction(tx as unknown as SelectableDatabase, input);
    });
  }

  async assertCompanyHasPositiveBalanceInTransaction(
    database: SelectableDatabase,
    input: { companyId: string },
  ): Promise<void> {
    const status = await this.checkCompanyHasPositiveBalanceInTransaction(database, input);
    if (!status.allowed) {
      throw new Error(status.message ?? CompanyWalletService.depletedMessage);
    }
  }

  async checkCompanyHasPositiveBalanceInTransaction(
    database: SelectableDatabase,
    input: { companyId: string },
  ): Promise<CompanyWalletBalanceStatus> {
    const companyWallets = await this.loadCompanyWallets(database, input.companyId);
    const balanceNanoUsd = companyWallets.reduce((total, wallet) => total + wallet.amountNanoUsd, 0);
    return {
      allowed: balanceNanoUsd > 0,
      balanceNanoUsd,
      ...(balanceNanoUsd > 0 ? {} : { message: CompanyWalletService.depletedMessage }),
    };
  }

  async ensureSubscriptionWalletForCompany(
    transactionProvider: TransactionProviderInterface,
    input: { companyId: string; now?: Date; plan: CompanyWalletSubscriptionPlan },
  ): Promise<CompanyWalletRecord> {
    return transactionProvider.transaction(async (tx) => {
      return this.ensureSubscriptionWalletForCompanyInTransaction(tx as never, input);
    });
  }

  async ensureSubscriptionWalletForCompanyInTransaction(
    database: SelectableDatabase & InsertableDatabase,
    input: { companyId: string; now?: Date; plan: CompanyWalletSubscriptionPlan },
  ): Promise<CompanyWalletRecord> {
    const existingWallet = await this.loadSubscriptionWallet(database, input.companyId);
    if (existingWallet) {
      return existingWallet;
    }

    const now = input.now ?? new Date();
    const amountNanoUsd = this.getMonthlyRechargeAmount(input.plan);
    const [createdWallet] = await database
      .insert(wallets)
      .values({
        amountNanoUsd,
        companyId: input.companyId,
        createdAt: now,
        id: randomUUID(),
        type: "subscription",
        updatedAt: now,
      })
      .returning?.({
        amountNanoUsd: wallets.amountNanoUsd,
        companyId: wallets.companyId,
        id: wallets.id,
        type: wallets.type,
      }) as CompanyWalletRecord[];
    if (!createdWallet) {
      const concurrentWallet = await this.loadSubscriptionWallet(database, input.companyId);
      if (!concurrentWallet) {
        throw new Error("Failed to create company subscription wallet.");
      }
      return concurrentWallet;
    }

    const period = this.resolveSubscriptionPeriod(now);
    await this.insertTransactionIfNew(database, {
      amountNanoUsd,
      category: "opening",
      companyId: input.companyId,
      createdAt: now,
      periodEnd: period.periodEnd,
      periodStart: period.periodStart,
      sessionId: null,
      sessionTurnId: null,
      walletId: createdWallet.id,
    });

    return createdWallet;
  }

  async recordManagedLlmCharge(
    transactionProvider: TransactionProviderInterface,
    input: { amountNanoUsd: number; companyId: string; now?: Date; sessionId: string; sessionTurnId: string },
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      await this.recordManagedLlmChargeInTransaction(tx as never, input);
    });
  }

  async recordManagedLlmChargeInTransaction(
    database: SelectableDatabase & InsertableDatabase & UpdatableDatabase,
    input: { amountNanoUsd: number; companyId: string; now?: Date; sessionId: string; sessionTurnId: string },
  ): Promise<void> {
    if (input.amountNanoUsd <= 0) {
      return;
    }

    const now = input.now ?? new Date();
    const wallet = await this.requireSubscriptionWallet(database, input.companyId);
    const inserted = await this.insertTransactionIfNew(database, {
      amountNanoUsd: -input.amountNanoUsd,
      category: "llm_charge",
      companyId: input.companyId,
      createdAt: now,
      periodEnd: null,
      periodStart: null,
      sessionId: input.sessionId,
      sessionTurnId: input.sessionTurnId,
      walletId: wallet.id,
    });
    if (!inserted) {
      return;
    }

    await this.incrementWalletAmount(database, wallet, -input.amountNanoUsd, now);
  }

  async recordMonthlyRechargeInTransaction(
    database: SelectableDatabase & InsertableDatabase & UpdatableDatabase,
    input: { companyId: string; now?: Date; plan: CompanyWalletSubscriptionPlan },
  ): Promise<void> {
    const now = input.now ?? new Date();
    const wallet = await this.requireSubscriptionWallet(database, input.companyId);
    const period = this.resolveSubscriptionPeriod(now);
    const existingPeriodCredit = await this.hasSubscriptionCreditForPeriod(database, wallet.id, period.periodStart);
    if (existingPeriodCredit) {
      return;
    }

    const amountNanoUsd = this.getMonthlyRechargeAmount(input.plan);
    const inserted = await this.insertTransactionIfNew(database, {
      amountNanoUsd,
      category: "monthly_recharge",
      companyId: input.companyId,
      createdAt: now,
      periodEnd: period.periodEnd,
      periodStart: period.periodStart,
      sessionId: null,
      sessionTurnId: null,
      walletId: wallet.id,
    });
    if (!inserted) {
      return;
    }

    await this.incrementWalletAmount(database, wallet, amountNanoUsd, now);
  }

  async applyPendingPlanAndRechargeCompanyInTransaction(
    database: SelectableDatabase & InsertableDatabase & UpdatableDatabase,
    input: { companyId: string; now?: Date },
  ): Promise<void> {
    const now = input.now ?? new Date();
    const company = await this.loadCompany(database, input.companyId);
    let effectivePlan = company.plan;
    if (company.pendingPlan && company.pendingPlanEffectiveAt && company.pendingPlanEffectiveAt <= now) {
      effectivePlan = company.pendingPlan;
      await this.applyPendingPlan(database, input.companyId, effectivePlan);
    }

    await this.recordMonthlyRechargeInTransaction(database, {
      companyId: input.companyId,
      now,
      plan: effectivePlan,
    });
  }

  async schedulePlanChangeInTransaction(
    database: SelectableDatabase & InsertableDatabase & UpdatableDatabase,
    input: { companyId: string; nextPlan: CompanyWalletSubscriptionPlan; now?: Date },
  ): Promise<void> {
    const now = input.now ?? new Date();
    const company = await this.loadCompany(database, input.companyId);
    if (company.plan === input.nextPlan) {
      await this.applyPendingPlan(database, input.companyId, company.plan);
      return;
    }

    if (company.plan === "free" && input.nextPlan === "pro") {
      await this.applyPendingPlan(database, input.companyId, "pro");
      await this.recordUpgradeAdjustment(database, {
        companyId: input.companyId,
        now,
        previousPlan: "free",
        upgradedPlan: "pro",
      });
      return;
    }

    const nextPeriod = this.resolveSubscriptionPeriod(now).periodEnd;
    await database.update?.(companies)
      .set({
        pendingPlan: input.nextPlan,
        pendingPlanEffectiveAt: nextPeriod,
      })
      .where(eq(companies.id, input.companyId));
  }


  async rechargeDueSubscriptions(
    databaseOwner: DatabaseInterface,
    input: { now?: Date } = {},
  ): Promise<{ failedCompanyIds: string[]; processedCompanyCount: number }> {
    const database = databaseOwner.getDatabase() as SelectableDatabase & InsertableDatabase & UpdatableDatabase & {
      transaction?<T>(callback: (transaction: unknown) => Promise<T>): Promise<T>;
    };
    if (!database.transaction) {
      throw new Error("Configured database does not support wallet recharge transactions.");
    }

    const companyIds = await this.listRechargeableCompanyIds(database);
    const failedCompanyIds: string[] = [];
    for (const companyId of companyIds) {
      try {
        await database.transaction(async (tx) => {
          await this.applyPendingPlanAndRechargeCompanyInTransaction(tx as never, {
            companyId,
            now: input.now,
          });
        });
      } catch {
        failedCompanyIds.push(companyId);
      }
    }

    return {
      failedCompanyIds,
      processedCompanyCount: companyIds.length - failedCompanyIds.length,
    };
  }

  async listRechargeableCompanyIds(database: SelectableDatabase): Promise<string[]> {
    const companyRows = await this.resolveWhere(database
      .select({
        id: companies.id,
      })
      .from(companies)
      .where(sql`true`)) as Array<{ id: string }>;
    return companyRows.map((company) => company.id);
  }

  getMonthlyRechargeAmount(plan: CompanyWalletSubscriptionPlan): number {
    return CompanyWalletService.monthlyRechargeByPlan[plan];
  }

  resolveSubscriptionPeriod(now: Date): SubscriptionPeriod {
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { periodEnd, periodStart };
  }

  private async recordUpgradeAdjustment(
    database: SelectableDatabase & InsertableDatabase & UpdatableDatabase,
    input: {
      companyId: string;
      now: Date;
      previousPlan: CompanyWalletSubscriptionPlan;
      upgradedPlan: CompanyWalletSubscriptionPlan;
    },
  ): Promise<void> {
    const wallet = await this.requireSubscriptionWallet(database, input.companyId);
    const period = this.resolveSubscriptionPeriod(input.now);
    const amountNanoUsd = this.getMonthlyRechargeAmount(input.upgradedPlan) - this.getMonthlyRechargeAmount(input.previousPlan);
    if (amountNanoUsd <= 0) {
      return;
    }

    const inserted = await this.insertTransactionIfNew(database, {
      amountNanoUsd,
      category: "adjustment",
      companyId: input.companyId,
      createdAt: input.now,
      periodEnd: period.periodEnd,
      periodStart: period.periodStart,
      sessionId: null,
      sessionTurnId: null,
      walletId: wallet.id,
    });
    if (inserted) {
      await this.incrementWalletAmount(database, wallet, amountNanoUsd, input.now);
    }
  }

  private async loadCompany(database: SelectableDatabase, companyId: string): Promise<CompanyPlanRecord> {
    const companyRows = await this.resolveWhere(database
      .select({
        id: companies.id,
        pendingPlan: companies.pendingPlan,
        pendingPlanEffectiveAt: companies.pendingPlanEffectiveAt,
        plan: companies.plan,
      })
      .from(companies)
      .where(eq(companies.id, companyId))) as CompanyPlanRecord[];
    const [company] = companyRows;
    if (!company) {
      throw new Error("Company not found.");
    }

    return company;
  }

  private async applyPendingPlan(
    database: UpdatableDatabase,
    companyId: string,
    plan: CompanyWalletSubscriptionPlan,
  ): Promise<void> {
    await database.update?.(companies)
      .set({
        pendingPlan: null,
        pendingPlanEffectiveAt: null,
        plan,
      })
      .where(eq(companies.id, companyId));
  }

  private async loadCompanyWallets(database: SelectableDatabase, companyId: string): Promise<CompanyWalletRecord[]> {
    return this.resolveWhere(database
      .select({
        amountNanoUsd: wallets.amountNanoUsd,
        companyId: wallets.companyId,
        id: wallets.id,
        type: wallets.type,
      })
      .from(wallets)
      .where(eq(wallets.companyId, companyId))) as Promise<CompanyWalletRecord[]>;
  }

  private async loadSubscriptionWallet(
    database: SelectableDatabase,
    companyId: string,
  ): Promise<CompanyWalletRecord | null> {
    const walletRows = await this.loadCompanyWallets(database, companyId);
    return walletRows.find((wallet) => wallet.type === "subscription") ?? null;
  }

  private async requireSubscriptionWallet(database: SelectableDatabase, companyId: string): Promise<CompanyWalletRecord> {
    const wallet = await this.loadSubscriptionWallet(database, companyId);
    if (!wallet) {
      throw new Error("Company subscription wallet not found.");
    }

    return wallet;
  }

  private async hasSubscriptionCreditForPeriod(
    database: SelectableDatabase,
    walletId: string,
    periodStart: Date,
  ): Promise<boolean> {
    const transactionRows = await this.resolveWhere(database
      .select({
        category: walletTransactions.category,
        periodStart: walletTransactions.periodStart,
        walletId: walletTransactions.walletId,
      })
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.walletId, walletId),
        eq(walletTransactions.periodStart, periodStart),
      ))) as CompanyWalletTransactionRecord[];

    return transactionRows.some((transaction) =>
      transaction.walletId === walletId
      && (transaction.category === "opening" || transaction.category === "monthly_recharge")
      && transaction.periodStart?.getTime() === periodStart.getTime()
    );
  }

  private async insertTransactionIfNew(
    database: InsertableDatabase,
    input: {
      amountNanoUsd: number;
      category: WalletTransactionCategory;
      companyId: string;
      createdAt: Date;
      periodEnd: Date | null;
      periodStart: Date | null;
      sessionId: string | null;
      sessionTurnId: string | null;
      walletId: string;
    },
  ): Promise<boolean> {
    const insertOperation = database
      .insert(walletTransactions)
      .values({
        ...input,
        id: randomUUID(),
      });
    const conflictOperation = insertOperation.onConflictDoNothing?.();
    const rows = conflictOperation && "returning" in conflictOperation
      ? await conflictOperation.returning?.({ id: walletTransactions.id })
      : await insertOperation.returning?.({ id: walletTransactions.id });
    return (rows?.length ?? 0) > 0;
  }

  private async incrementWalletAmount(
    database: UpdatableDatabase,
    wallet: CompanyWalletRecord,
    amountDeltaNanoUsd: number,
    now: Date,
  ): Promise<void> {
    if (database.execute) {
      await database.execute(sql`
        UPDATE ${wallets}
        SET amount_nano_usd = amount_nano_usd + ${amountDeltaNanoUsd},
            updated_at = ${now.toISOString()}
        WHERE id = ${wallet.id}
      `);
      return;
    }

    await database.update?.(wallets)
      .set({
        amountNanoUsd: wallet.amountNanoUsd + amountDeltaNanoUsd,
        updatedAt: now,
      })
      .where(eq(wallets.id, wallet.id));
  }

  private async resolveWhere(whereResult: Promise<Array<Record<string, unknown>>> | {
    limit(limit: number): Promise<Array<Record<string, unknown>>>;
  }): Promise<Array<Record<string, unknown>>> {
    if (whereResult instanceof Promise) {
      return whereResult;
    }

    return whereResult.limit(10_000);
  }
}
