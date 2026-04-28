import assert from "node:assert/strict";
import { test } from "vitest";
import { companies, llmUsageAggregates } from "../src/db/schema.ts";
import { CompanyManagedLlmBudgetService } from "../src/services/ai_providers/company_managed_llm_budget_service.ts";

type CompanyManagedLlmBudgetServiceHarnessInput = {
  companyPlan?: "free" | "pro";
  dayCostNanoUsd?: number;
  monthCostNanoUsd?: number;
};

/**
 * Provides a tiny table-aware database double so budget tests verify the service reads company
 * plan and managed-provider usage without coupling to Drizzle SQL internals.
 */
class CompanyManagedLlmBudgetServiceTestHarness {
  readonly selectedTables: unknown[] = [];
  private readonly input: CompanyManagedLlmBudgetServiceHarnessInput;

  constructor(input: CompanyManagedLlmBudgetServiceHarnessInput) {
    this.input = input;
  }

  createDatabase() {
    return {
      select: () => {
        return {
          from: (table: unknown) => {
            this.selectedTables.push(table);
            return {
              where: async () => {
                if (table === companies) {
                  return [{
                    plan: this.input.companyPlan ?? "free",
                  }];
                }
                if (table === llmUsageAggregates) {
                  const aggregateCallCount = this.selectedTables.filter((selectedTable) => selectedTable === llmUsageAggregates).length;
                  const totalCostNanoVirtualUsd = aggregateCallCount === 1
                    ? (this.input.dayCostNanoUsd ?? 0)
                    : (this.input.monthCostNanoUsd ?? 0);
                  return totalCostNanoVirtualUsd > 0 ? [{ totalCostNanoVirtualUsd }] : [];
                }

                throw new Error("Unexpected table.");
              },
            };
          },
        };
      },
    };
  }
}

test("CompanyManagedLlmBudgetService blocks free companies at the daily managed-provider cap", async () => {
  const service = new CompanyManagedLlmBudgetService();
  const harness = new CompanyManagedLlmBudgetServiceTestHarness({
    dayCostNanoUsd: 2_000_000_000,
  });

  const status = await service.checkWithinPlatformBudgetInTransaction(harness.createDatabase() as never, {
    companyId: "00000000-0000-0000-0000-000000000001",
    now: new Date("2026-04-22T12:00:00.000Z"),
  });

  assert.equal(status.allowed, false);
  if (!status.allowed) {
    assert.equal(status.period, "day");
    assert.equal(status.limitCostNanoUsd, 2_000_000_000);
    assert.equal(status.usedCostNanoUsd, 2_000_000_000);
    assert.equal(status.periodStart.toISOString(), "2026-04-22T00:00:00.000Z");
  }
});

test("CompanyManagedLlmBudgetService blocks free companies at the monthly managed-provider cap", async () => {
  const service = new CompanyManagedLlmBudgetService();
  const harness = new CompanyManagedLlmBudgetServiceTestHarness({
    dayCostNanoUsd: 1_000_000_000,
    monthCostNanoUsd: 10_000_000_000,
  });

  const status = await service.checkWithinPlatformBudgetInTransaction(harness.createDatabase() as never, {
    companyId: "00000000-0000-0000-0000-000000000001",
    now: new Date("2026-04-22T12:00:00.000Z"),
  });

  assert.equal(status.allowed, false);
  if (!status.allowed) {
    assert.equal(status.period, "month");
    assert.equal(status.limitCostNanoUsd, 10_000_000_000);
    assert.equal(status.usedCostNanoUsd, 10_000_000_000);
    assert.equal(status.periodStart.toISOString(), "2026-04-01T00:00:00.000Z");
  }
});

test("CompanyManagedLlmBudgetService allows pro companies below the managed-provider cap", async () => {
  const service = new CompanyManagedLlmBudgetService();
  const harness = new CompanyManagedLlmBudgetServiceTestHarness({
    companyPlan: "pro",
    dayCostNanoUsd: 19_000_000_000,
    monthCostNanoUsd: 99_000_000_000,
  });

  const status = await service.checkWithinPlatformBudgetInTransaction(harness.createDatabase() as never, {
    companyId: "00000000-0000-0000-0000-000000000001",
    now: new Date("2026-04-22T12:00:00.000Z"),
  });

  assert.deepEqual(status, {
    allowed: true,
  });
  assert.deepEqual(harness.selectedTables, [
    companies,
    llmUsageAggregates,
    llmUsageAggregates,
  ]);
});

test("CompanyManagedLlmBudgetService returns remaining and overage values for managed usage", async () => {
  const service = new CompanyManagedLlmBudgetService();
  const harness = new CompanyManagedLlmBudgetServiceTestHarness({
    dayCostNanoUsd: 1_250_000_000,
    monthCostNanoUsd: 10_500_000_000,
  });

  const snapshot = await service.getBudgetSnapshotInTransaction(harness.createDatabase() as never, {
    companyId: "00000000-0000-0000-0000-000000000001",
    now: new Date("2026-04-22T12:00:00.000Z"),
  });

  assert.equal(snapshot.plan, "free");
  assert.deepEqual(snapshot.daily, {
    exhausted: false,
    limitCostNanoUsd: 2_000_000_000,
    overageCostNanoUsd: 0,
    period: "day",
    periodStart: new Date("2026-04-22T00:00:00.000Z"),
    remainingCostNanoUsd: 750_000_000,
    usedCostNanoUsd: 1_250_000_000,
  });
  assert.deepEqual(snapshot.monthly, {
    exhausted: true,
    limitCostNanoUsd: 10_000_000_000,
    overageCostNanoUsd: 500_000_000,
    period: "month",
    periodStart: new Date("2026-04-01T00:00:00.000Z"),
    remainingCostNanoUsd: 0,
    usedCostNanoUsd: 10_500_000_000,
  });
});
