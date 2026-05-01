import assert from "node:assert/strict";
import { test } from "vitest";
import { companies, walletTransactions, wallets } from "../src/db/schema.ts";
import { CompanyBillingPlanCatalog } from "../src/services/company_billing_plan_catalog.ts";
import { CompanyWalletService } from "../src/services/wallet/service.ts";

type WalletRecord = {
  amountNanoUsd: number;
  companyId: string;
  id: string;
  type: "subscription" | "pay_as_you_go";
};

type WalletTransactionRecord = {
  amountNanoUsd: number;
  category: "llm_charge" | "monthly_recharge" | "adjustment" | "opening";
  companyId: string;
  createdAt: Date;
  id: string;
  periodEnd: Date | null;
  periodStart: Date | null;
  sessionId: string | null;
  sessionTurnId: string | null;
  walletId: string;
};

type CompanyRecord = {
  id: string;
  pendingPlan: "free" | "plus" | "pro" | null;
  pendingPlanEffectiveAt: Date | null;
  plan: "free" | "plus" | "pro";
};

/**
 * Provides a table-aware database double for the wallet service. The fake intentionally implements
 * insert conflict behavior so service tests catch duplicate charge and recharge bugs without a real
 * Postgres dependency.
 */
class CompanyWalletServiceHarness {
  readonly companies: CompanyRecord[] = [];
  readonly transactions: WalletTransactionRecord[] = [];
  readonly wallets: WalletRecord[] = [];

  constructor() {
    this.companies.push({
      id: "company-1",
      pendingPlan: null,
      pendingPlanEffectiveAt: null,
      plan: "free",
    });
  }

  createDatabase() {
    return {
      select: () => ({
        from: (table: unknown) => ({
          where: async () => {
            if (table === companies) {
              return this.companies;
            }
            if (table === wallets) {
              return this.wallets;
            }
            if (table === walletTransactions) {
              return this.transactions;
            }
            throw new Error("Unexpected selected table.");
          },
        }),
      }),
      insert: (table: unknown) => ({
        values: (value: Record<string, unknown>) => ({
          onConflictDoNothing: () => ({
            returning: async () => this.insertReturning(table, value),
          }),
          returning: async () => this.insertReturning(table, value),
        }),
      }),
      update: (table: unknown) => ({
        set: (value: Record<string, unknown>) => ({
          where: async () => this.updateRows(table, value),
        }),
      }),
    };
  }

  private insertReturning(table: unknown, value: Record<string, unknown>): unknown[] {
    if (table === wallets) {
      const existing = this.wallets.find((wallet) => wallet.companyId === value.companyId && wallet.type === value.type);
      if (existing) {
        return [];
      }
      const wallet: WalletRecord = {
        amountNanoUsd: Number(value.amountNanoUsd ?? 0),
        companyId: String(value.companyId),
        id: String(value.id ?? `wallet-${this.wallets.length + 1}`),
        type: value.type as WalletRecord["type"],
      };
      this.wallets.push(wallet);
      return [wallet];
    }
    if (table === walletTransactions) {
      const transaction = value as unknown as WalletTransactionRecord;
      if (transaction.category === "llm_charge" && transaction.sessionTurnId) {
        const duplicate = this.transactions.find((existing) =>
          existing.category === "llm_charge"
          && existing.sessionTurnId === transaction.sessionTurnId
          && existing.walletId === transaction.walletId
        );
        if (duplicate) {
          return [];
        }
      }
      if (transaction.category === "monthly_recharge" && transaction.periodStart) {
        const duplicate = this.transactions.find((existing) =>
          existing.walletId === transaction.walletId
          && existing.category === "monthly_recharge"
          && existing.periodStart?.getTime() === transaction.periodStart?.getTime()
        );
        if (duplicate) {
          return [];
        }
      }
      if (transaction.category === "opening") {
        const duplicate = this.transactions.find((existing) =>
          existing.walletId === transaction.walletId && existing.category === "opening"
        );
        if (duplicate) {
          return [];
        }
      }
      this.transactions.push({
        amountNanoUsd: Number(value.amountNanoUsd),
        category: value.category as WalletTransactionRecord["category"],
        companyId: String(value.companyId),
        createdAt: value.createdAt as Date,
        id: String(value.id ?? `transaction-${this.transactions.length + 1}`),
        periodEnd: value.periodEnd as Date | null ?? null,
        periodStart: value.periodStart as Date | null ?? null,
        sessionId: value.sessionId as string | null ?? null,
        sessionTurnId: value.sessionTurnId as string | null ?? null,
        walletId: String(value.walletId),
      });
      return [this.transactions.at(-1)!];
    }
    throw new Error("Unexpected inserted table.");
  }

  private updateRows(table: unknown, value: Record<string, unknown>): void {
    if (table === wallets) {
      return;
    }
    if (table === companies) {
      const company = this.companies[0]!;
      company.plan = value.plan as CompanyRecord["plan"] ?? company.plan;
      company.pendingPlan = value.pendingPlan as CompanyRecord["pendingPlan"] ?? null;
      company.pendingPlanEffectiveAt = value.pendingPlanEffectiveAt as Date | null ?? null;
      return;
    }
    throw new Error("Unexpected updated table.");
  }
}

test("CompanyWalletService allows only companies with positive wallet balance", async () => {
  const service = new CompanyWalletService();
  const harness = new CompanyWalletServiceHarness();
  harness.wallets.push({ amountNanoUsd: 1, companyId: "company-1", id: "wallet-1", type: "subscription" });

  assert.deepEqual(await service.checkCompanyHasPositiveBalanceInTransaction(harness.createDatabase() as never, {
    companyId: "company-1",
  }), {
    allowed: true,
    balanceNanoUsd: 1,
  });

  harness.wallets[0]!.amountNanoUsd = 0;
  const zeroStatus = await service.checkCompanyHasPositiveBalanceInTransaction(harness.createDatabase() as never, {
    companyId: "company-1",
  });
  assert.equal(zeroStatus.allowed, false);
  assert.equal(zeroStatus.balanceNanoUsd, 0);

  harness.wallets[0]!.amountNanoUsd = -5;
  const negativeStatus = await service.checkCompanyHasPositiveBalanceInTransaction(harness.createDatabase() as never, {
    companyId: "company-1",
  });
  assert.equal(negativeStatus.allowed, false);
  assert.equal(negativeStatus.balanceNanoUsd, -5);
});

test("CompanyWalletService bootstraps a subscription wallet with opening credit", async () => {
  const service = new CompanyWalletService();
  const planCatalog = new CompanyBillingPlanCatalog();
  const harness = new CompanyWalletServiceHarness();

  await service.ensureSubscriptionWalletForCompanyInTransaction(harness.createDatabase() as never, {
    companyId: "company-1",
    now: new Date("2026-05-20T10:00:00.000Z"),
    plan: "free",
  });

  assert.equal(harness.wallets.length, 1);
  assert.equal(harness.wallets[0]!.amountNanoUsd, planCatalog.requirePlan("free").monthlyCreditsNanoUsd);
  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.transactions[0]!.category, "opening");
  assert.equal(harness.transactions[0]!.periodStart?.toISOString(), "2026-05-01T00:00:00.000Z");
  assert.equal(harness.transactions[0]!.periodEnd?.toISOString(), "2026-06-01T00:00:00.000Z");
});

test("CompanyWalletService records managed LLM charges idempotently", async () => {
  const service = new CompanyWalletService();
  const harness = new CompanyWalletServiceHarness();
  harness.wallets.push({ amountNanoUsd: 10_000, companyId: "company-1", id: "wallet-1", type: "subscription" });

  await service.recordManagedLlmChargeInTransaction(harness.createDatabase() as never, {
    amountNanoUsd: 250,
    companyId: "company-1",
    now: new Date("2026-05-20T10:00:00.000Z"),
    sessionId: "session-1",
    sessionTurnId: "turn-1",
  });
  await service.recordManagedLlmChargeInTransaction(harness.createDatabase() as never, {
    amountNanoUsd: 250,
    companyId: "company-1",
    now: new Date("2026-05-20T10:00:00.000Z"),
    sessionId: "session-1",
    sessionTurnId: "turn-1",
  });

  assert.equal(harness.wallets[0]!.amountNanoUsd, 9_750);
  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.transactions[0]!.category, "llm_charge");
  assert.equal(harness.transactions[0]!.amountNanoUsd, -250);
});

test("CompanyWalletService spends subscription credits before pay as you go credits", async () => {
  const service = new CompanyWalletService();
  const harness = new CompanyWalletServiceHarness();
  harness.wallets.push({ amountNanoUsd: 100, companyId: "company-1", id: "subscription-wallet", type: "subscription" });
  harness.wallets.push({ amountNanoUsd: 1_000, companyId: "company-1", id: "paygo-wallet", type: "pay_as_you_go" });

  await service.recordManagedLlmChargeInTransaction(harness.createDatabase() as never, {
    amountNanoUsd: 250,
    companyId: "company-1",
    now: new Date("2026-05-20T10:00:00.000Z"),
    sessionId: "session-1",
    sessionTurnId: "turn-1",
  });
  await service.recordManagedLlmChargeInTransaction(harness.createDatabase() as never, {
    amountNanoUsd: 250,
    companyId: "company-1",
    now: new Date("2026-05-20T10:00:00.000Z"),
    sessionId: "session-1",
    sessionTurnId: "turn-1",
  });

  assert.equal(harness.wallets.find((wallet) => wallet.type === "subscription")?.amountNanoUsd, 0);
  assert.equal(harness.wallets.find((wallet) => wallet.type === "pay_as_you_go")?.amountNanoUsd, 850);
  assert.deepEqual(harness.transactions.map((transaction) => ({
    amountNanoUsd: transaction.amountNanoUsd,
    walletId: transaction.walletId,
  })), [
    {
      amountNanoUsd: -100,
      walletId: "subscription-wallet",
    },
    {
      amountNanoUsd: -150,
      walletId: "paygo-wallet",
    },
  ]);
});

test("CompanyWalletService records manual adjustments against the selected wallet", async () => {
  const service = new CompanyWalletService();
  const harness = new CompanyWalletServiceHarness();
  harness.wallets.push({ amountNanoUsd: 1_000, companyId: "company-1", id: "wallet-1", type: "subscription" });

  const positiveAdjustment = await service.recordAdjustmentInTransaction(harness.createDatabase() as never, {
    amountNanoUsd: 500,
    companyId: "company-1",
    now: new Date("2026-05-20T10:00:00.000Z"),
    walletId: "wallet-1",
  });
  const negativeAdjustment = await service.recordAdjustmentInTransaction(harness.createDatabase() as never, {
    amountNanoUsd: -250,
    companyId: "company-1",
    now: new Date("2026-05-20T10:05:00.000Z"),
    walletId: "wallet-1",
  });

  assert.equal(harness.wallets[0]!.amountNanoUsd, 1_250);
  assert.equal(positiveAdjustment.category, "adjustment");
  assert.equal(positiveAdjustment.amountNanoUsd, 500);
  assert.equal(negativeAdjustment.category, "adjustment");
  assert.equal(negativeAdjustment.amountNanoUsd, -250);
  assert.deepEqual(harness.transactions.map((transaction) => transaction.amountNanoUsd), [500, -250]);
});

test("CompanyWalletService monthly recharge skips a period already opened", async () => {
  const service = new CompanyWalletService();
  const harness = new CompanyWalletServiceHarness();
  harness.wallets.push({ amountNanoUsd: 10_000_000_000, companyId: "company-1", id: "wallet-1", type: "subscription" });
  harness.transactions.push({
    amountNanoUsd: 10_000_000_000,
    category: "opening",
    companyId: "company-1",
    createdAt: new Date("2026-05-20T10:00:00.000Z"),
    id: "opening-1",
    periodEnd: new Date("2026-06-01T00:00:00.000Z"),
    periodStart: new Date("2026-05-01T00:00:00.000Z"),
    sessionId: null,
    sessionTurnId: null,
    walletId: "wallet-1",
  });

  await service.recordMonthlyRechargeInTransaction(harness.createDatabase() as never, {
    companyId: "company-1",
    now: new Date("2026-05-21T10:00:00.000Z"),
    plan: "free",
  });

  assert.equal(harness.wallets[0]!.amountNanoUsd, 10_000_000_000);
  assert.equal(harness.transactions.length, 1);
});

test("CompanyWalletService applies plus upgrades immediately with a credit adjustment", async () => {
  const service = new CompanyWalletService();
  const harness = new CompanyWalletServiceHarness();
  harness.wallets.push({ amountNanoUsd: 10_000_000_000, companyId: "company-1", id: "wallet-1", type: "subscription" });

  await service.schedulePlanChangeInTransaction(harness.createDatabase() as never, {
    companyId: "company-1",
    nextPlan: "plus",
    now: new Date("2026-05-21T10:00:00.000Z"),
  });

  assert.equal(harness.companies[0]!.plan, "plus");
  assert.equal(harness.companies[0]!.pendingPlan, null);
  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.transactions[0]!.category, "adjustment");
  assert.equal(harness.transactions[0]!.amountNanoUsd, 40_000_000_000);
  assert.equal(harness.wallets[0]!.amountNanoUsd, 50_000_000_000);
});
