import assert from "node:assert/strict";
import { test } from "vitest";
import { CompanyBillingPlanCatalog } from "../src/services/company_billing_plan_catalog.ts";

test("CompanyBillingPlanCatalog exposes wallet credits and Paddle price metadata for each plan", () => {
  const catalog = new CompanyBillingPlanCatalog();
  const plans = catalog.listPlans();

  assert.deepEqual(plans.map((plan) => plan.key), ["free", "plus", "pro"]);
  assert.equal(catalog.requirePlan("free").description, "Starter workspace access");
  assert.equal(catalog.requirePlan("free").monthlyCreditsNanoUsd, 10_000_000_000);
  assert.equal(catalog.requirePlan("plus").description, "For teams using agents weekly");
  assert.equal(catalog.requirePlan("plus").monthlyCreditsNanoUsd, 50_000_000_000);
  assert.equal(catalog.requirePlan("plus").paddlePriceId, "pri_01kqjv0bbshwax37ww7e05myec");
  assert.equal(catalog.requirePlan("plus").priceCents, 900);
  assert.equal(catalog.requirePlan("pro").description, "For teams running agents daily");
  assert.equal(catalog.requirePlan("pro").monthlyCreditsNanoUsd, 500_000_000_000);
  assert.equal(catalog.requirePlan("pro").paddlePriceId, "pri_01kqjv285arzc036p0xjwwa0vd");
  assert.equal(catalog.requirePlan("pro").priceCents, 9_900);
});
