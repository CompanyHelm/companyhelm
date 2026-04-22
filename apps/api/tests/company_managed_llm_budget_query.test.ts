import assert from "node:assert/strict";
import { test } from "vitest";
import { CompanyManagedLlmBudgetQueryResolver } from "../src/graphql/resolvers/company_managed_llm_budget.ts";

class CompanyManagedLlmBudgetQueryTestHarness {
  static createContext() {
    return {
      authSession: {
        company: {
          id: "company-1",
          name: "Example Org",
        },
        token: "token",
        user: {
          id: "user-1",
        },
      },
      app_runtime_transaction_provider: {},
    } as never;
  }
}

test("CompanyManagedLlmBudgetQueryResolver serializes the authenticated company's budget snapshot", async () => {
  const resolver = new CompanyManagedLlmBudgetQueryResolver({
    async getBudgetSnapshot(_transactionProvider: unknown, input: { companyId: string }) {
      assert.equal(input.companyId, "company-1");
      return {
        daily: {
          exhausted: false,
          limitCostNanoUsd: 2_000_000_000,
          overageCostNanoUsd: 0,
          period: "day",
          periodStart: new Date("2026-04-22T00:00:00.000Z"),
          remainingCostNanoUsd: 750_000_000,
          usedCostNanoUsd: 1_250_000_000,
        },
        managedCredentialId: "credential-1",
        monthly: {
          exhausted: true,
          limitCostNanoUsd: 10_000_000_000,
          overageCostNanoUsd: 500_000_000,
          period: "month",
          periodStart: new Date("2026-04-01T00:00:00.000Z"),
          remainingCostNanoUsd: 0,
          usedCostNanoUsd: 10_500_000_000,
        },
        plan: "free",
      };
    },
  } as never);

  const result = await resolver.execute(
    null,
    {},
    CompanyManagedLlmBudgetQueryTestHarness.createContext(),
  );

  assert.deepEqual(result, {
    daily: {
      exhausted: false,
      limitCostNanoUsd: 2_000_000_000,
      overageCostNanoUsd: 0,
      period: "day",
      periodStart: "2026-04-22T00:00:00.000Z",
      remainingCostNanoUsd: 750_000_000,
      usedCostNanoUsd: 1_250_000_000,
    },
    managedCredentialId: "credential-1",
    monthly: {
      exhausted: true,
      limitCostNanoUsd: 10_000_000_000,
      overageCostNanoUsd: 500_000_000,
      period: "month",
      periodStart: "2026-04-01T00:00:00.000Z",
      remainingCostNanoUsd: 0,
      usedCostNanoUsd: 10_500_000_000,
    },
    plan: "free",
  });
});

test("CompanyManagedLlmBudgetQueryResolver requires authentication", async () => {
  const resolver = new CompanyManagedLlmBudgetQueryResolver({
    async getBudgetSnapshot() {
      throw new Error("Budget service should not run.");
    },
  } as never);

  await assert.rejects(
    resolver.execute(null, {}, {
      app_runtime_transaction_provider: {},
      authSession: null,
    } as never),
    /Authentication required/,
  );
});
