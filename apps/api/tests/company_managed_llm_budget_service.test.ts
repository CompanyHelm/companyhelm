import assert from "node:assert/strict";
import { test } from "vitest";
import { companies, llmUsageAggregates, modelProviderCredentials } from "../src/db/schema.ts";
import { CompanyManagedLlmBudgetService } from "../src/services/ai_providers/company_managed_llm_budget_service.ts";

type CompanyManagedLlmBudgetServiceHarnessInput = {
  companyPlan?: "free" | "pro";
  credentialIsManaged?: boolean;
  dayCostNanoUsd?: number;
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
                  return [{
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

test("CompanyManagedLlmBudgetService allows pro companies without aggregate reads", async () => {
  const service = new CompanyManagedLlmBudgetService();
  const harness = new CompanyManagedLlmBudgetServiceTestHarness({
    companyPlan: "pro",
  });

  const status = await service.checkWithinBudgetInTransaction(harness.createDatabase() as never, {
    companyId: "00000000-0000-0000-0000-000000000001",
    modelProviderCredentialId: "00000000-0000-0000-0000-000000000002",
    now: new Date("2026-04-22T12:00:00.000Z"),
  });

  assert.deepEqual(status, {
    allowed: true,
  });
  assert.deepEqual(harness.selectedTables, [modelProviderCredentials, companies]);
});
