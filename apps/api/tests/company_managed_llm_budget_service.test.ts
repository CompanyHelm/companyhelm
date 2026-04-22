import assert from "node:assert/strict";
import { test } from "vitest";
import { companies, llmUsageAggregates, modelProviderCredentials } from "../src/db/schema.ts";
import { CompanyManagedLlmBudgetService } from "../src/services/ai_providers/company_managed_llm_budget_service.ts";

type CompanyManagedLlmBudgetServiceHarnessInput = {
  companyPlan?: "free" | "pro";
  credentialIsManaged?: boolean;
  dayCostNanoUsd?: number;
  managedCredentialId?: string | null;
  monthCostNanoUsd?: number;
};

/**
 * Provides a tiny table-aware database double so budget tests verify the service reads company
 * plan, credential ownership, and provider-scoped usage without coupling to Drizzle SQL internals.
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
                if (table === modelProviderCredentials) {
                  if (this.input.managedCredentialId === null) {
                    return [];
                  }

                  return [{
                    id: this.input.managedCredentialId ?? "00000000-0000-0000-0000-000000000002",
                    isManaged: this.input.credentialIsManaged ?? true,
                  }];
                }
                if (table === companies) {
                  return [{
                    plan: this.input.companyPlan ?? "free",
                  }];
                }
                if (table === llmUsageAggregates) {
                  const aggregateCallCount = this.selectedTables.filter((selectedTable) => selectedTable === llmUsageAggregates).length;
                  const totalCostNanoUsd = aggregateCallCount === 1
                    ? (this.input.dayCostNanoUsd ?? 0)
                    : (this.input.monthCostNanoUsd ?? 0);
                  return totalCostNanoUsd > 0 ? [{ totalCostNanoUsd }] : [];
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

test("CompanyManagedLlmBudgetService allows unmanaged credentials without reading company usage", async () => {
  const service = new CompanyManagedLlmBudgetService();
  const harness = new CompanyManagedLlmBudgetServiceTestHarness({
    credentialIsManaged: false,
  });

  const status = await service.checkWithinBudgetInTransaction(harness.createDatabase() as never, {
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000002",
    now: new Date("2026-04-22T12:00:00.000Z"),
  });

  assert.deepEqual(status, {
    allowed: true,
  });
  assert.deepEqual(harness.selectedTables, [modelProviderCredentials]);
});

test("CompanyManagedLlmBudgetService blocks free companies at the daily managed-provider cap", async () => {
  const service = new CompanyManagedLlmBudgetService();
  const harness = new CompanyManagedLlmBudgetServiceTestHarness({
    dayCostNanoUsd: 2_000_000_000,
  });

  const status = await service.checkWithinBudgetInTransaction(harness.createDatabase() as never, {
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000002",
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

  const status = await service.checkWithinBudgetInTransaction(harness.createDatabase() as never, {
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000002",
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

  const status = await service.checkWithinBudgetInTransaction(harness.createDatabase() as never, {
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000002",
    now: new Date("2026-04-22T12:00:00.000Z"),
  });

  assert.deepEqual(status, {
    allowed: true,
  });
  assert.deepEqual(harness.selectedTables, [
    modelProviderCredentials,
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
  assert.equal(snapshot.managedCredentialId, "00000000-0000-0000-0000-000000000002");
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

test("CompanyManagedLlmBudgetService returns zero usage when the managed credential is not provisioned", async () => {
  const service = new CompanyManagedLlmBudgetService();
  const harness = new CompanyManagedLlmBudgetServiceTestHarness({
    managedCredentialId: null,
  });

  const snapshot = await service.getBudgetSnapshotInTransaction(harness.createDatabase() as never, {
    companyId: "00000000-0000-0000-0000-000000000001",
    now: new Date("2026-04-22T12:00:00.000Z"),
  });

  assert.equal(snapshot.managedCredentialId, null);
  assert.equal(snapshot.daily.usedCostNanoUsd, 0);
  assert.equal(snapshot.daily.remainingCostNanoUsd, 2_000_000_000);
  assert.equal(snapshot.monthly.usedCostNanoUsd, 0);
  assert.equal(snapshot.monthly.remainingCostNanoUsd, 10_000_000_000);
  assert.deepEqual(harness.selectedTables, [companies, modelProviderCredentials]);
});
