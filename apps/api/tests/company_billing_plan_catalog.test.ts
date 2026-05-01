import assert from "node:assert/strict";
import { test } from "vitest";
import { CompanyBillingPlanCatalog } from "../src/services/company_billing_plan_catalog.ts";

test("CompanyBillingPlanCatalog exposes wallet credits and Paddle price metadata for each plan", () => {
  const catalog = new CompanyBillingPlanCatalog();
  const plans = catalog.listPlans();

  assert.deepEqual(plans.map((plan) => plan.key), ["free", "pro"]);
  assert.equal(catalog.requirePlan("free").monthlyCreditsNanoUsd, 10_000_000_000);
  assert.equal(catalog.requirePlan("pro").monthlyCreditsNanoUsd, 100_000_000_000);
  assert.equal(catalog.requirePlan("pro").paddlePriceId, "pri_placeholder_pro_monthly");
  assert.equal(catalog.requirePlan("pro").priceCents, 2_000);
});
