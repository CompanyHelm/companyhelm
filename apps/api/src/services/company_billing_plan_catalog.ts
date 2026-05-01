export type CompanyBillingPlanKey = "free" | "pro";

export type CompanyBillingPlan = {
  currencyCode: "USD";
  description: string;
  key: CompanyBillingPlanKey;
  monthlyCreditsNanoUsd: number;
  name: string;
  paddlePriceId: string | null;
  priceCents: number;
};

/**
 * Centralizes CompanyHelm's commercial plan catalog so Paddle price identifiers, displayed plan
 * copy, and wallet recharge credits move together instead of drifting across API and web surfaces.
 */
export class CompanyBillingPlanCatalog {
  private static readonly nanoUsdPerUsd = 1_000_000_000;
  private static readonly plans: readonly CompanyBillingPlan[] = [
    {
      currencyCode: "USD",
      description: "Core CompanyHelm workspace access with starter managed-model credits.",
      key: "free",
      monthlyCreditsNanoUsd: 10 * CompanyBillingPlanCatalog.nanoUsdPerUsd,
      name: "Free",
      paddlePriceId: null,
      priceCents: 0,
    },
    {
      currencyCode: "USD",
      description: "Higher managed-model credit allowance for teams running CompanyHelm daily.",
      key: "pro",
      monthlyCreditsNanoUsd: 100 * CompanyBillingPlanCatalog.nanoUsdPerUsd,
      name: "Pro",
      paddlePriceId: "pri_placeholder_pro_monthly",
      priceCents: 2_000,
    },
  ];

  listPlans(): CompanyBillingPlan[] {
    return CompanyBillingPlanCatalog.plans.map((plan) => ({ ...plan }));
  }

  requirePlan(key: CompanyBillingPlanKey): CompanyBillingPlan {
    const plan = CompanyBillingPlanCatalog.plans.find((candidate) => candidate.key === key);
    if (!plan) {
      throw new Error(`Unknown CompanyHelm billing plan: ${key}`);
    }

    return { ...plan };
  }

  getMonthlyCreditsNanoUsd(key: CompanyBillingPlanKey): number {
    return this.requirePlan(key).monthlyCreditsNanoUsd;
  }
}
