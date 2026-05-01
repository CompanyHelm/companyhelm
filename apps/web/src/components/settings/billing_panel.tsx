import { useState } from "react";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { config } from "@/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaddleCheckout } from "@/lib/paddle_checkout";
import { UsageMetrics } from "@/lib/usage_metrics";

export type BillingPlanRecord = {
  currencyCode: string;
  description: string;
  key: string;
  monthlyCreditsNanoUsd: number;
  name: string;
  paddlePriceId: string | null | undefined;
  priceCents: number;
};

export type BillingRecord = {
  currentPlan: string;
  nextRechargeAt: string;
  pendingPlan: string | null | undefined;
  pendingPlanEffectiveAt: string | null | undefined;
  wallets: ReadonlyArray<{
    amountNanoUsd: number;
    type: string;
  }>;
};

type BillingPanelProps = {
  billing: BillingRecord;
  companyId: string;
  plans: ReadonlyArray<BillingPlanRecord>;
};

/**
 * Summarizes the active subscription plan and remaining subscription credits inside settings so
 * billing state lives alongside the rest of the company configuration surface.
 */
export function BillingPanel(props: BillingPanelProps) {
  const [checkoutErrorMessage, setCheckoutErrorMessage] = useState<string | null>(null);
  const [isOpeningCheckout, setOpeningCheckout] = useState(false);
  const subscriptionWallet = props.billing.wallets.find((wallet) => wallet.type === "subscription");
  const payAsYouGoWallet = props.billing.wallets.find((wallet) => wallet.type === "pay_as_you_go");
  const currentPlan = findPlan(props.plans, props.billing.currentPlan);
  const upgradePlan = findPlan(props.plans, "pro");
  const pendingPlanLabel = props.billing.pendingPlan ? findPlanName(props.plans, props.billing.pendingPlan) : null;
  const isCurrentPlanPro = props.billing.currentPlan === "pro";
  const isPendingPro = props.billing.pendingPlan === "pro";
  const canOpenCheckout = Boolean(
    upgradePlan?.paddlePriceId
    && !upgradePlan.paddlePriceId.includes("placeholder")
    && config.paddle.clientToken.length > 0
    && !isCurrentPlanPro
    && !isPendingPro,
  );
  const upgradeUnavailableMessage = resolveUpgradeUnavailableMessage({
    hasClientToken: config.paddle.clientToken.length > 0,
    isCurrentPlanPro,
    isPendingPro,
    upgradePlan,
  });

  return (
    <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            Subscription plan and managed-model credits for the current CompanyHelm workspace.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/90 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
              Current plan
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">{currentPlan?.name ?? props.billing.currentPlan}</p>
            {currentPlan ? (
              <p className="mt-1 text-xs text-muted-foreground">{currentPlan.description}</p>
            ) : null}
            {pendingPlanLabel && props.billing.pendingPlanEffectiveAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Changes to {pendingPlanLabel} on {formatTimestamp(props.billing.pendingPlanEffectiveAt)}.
              </p>
            ) : null}
            {upgradeUnavailableMessage ? (
              <p className="mt-2 text-xs text-muted-foreground">{upgradeUnavailableMessage}</p>
            ) : null}
            {checkoutErrorMessage ? (
              <p className="mt-2 text-xs text-destructive">{checkoutErrorMessage}</p>
            ) : null}
          </div>
          {upgradePlan && !isCurrentPlanPro ? (
            <Button
              className="w-full sm:w-auto"
              disabled={!canOpenCheckout || isOpeningCheckout}
              onClick={async () => {
                if (!upgradePlan.paddlePriceId) {
                  return;
                }

                setCheckoutErrorMessage(null);
                setOpeningCheckout(true);
                try {
                  await PaddleCheckout.open({
                    clientToken: config.paddle.clientToken,
                    companyId: props.companyId,
                    environment: config.paddle.environment,
                    planKey: upgradePlan.key,
                    priceId: upgradePlan.paddlePriceId,
                  });
                } catch (error) {
                  setCheckoutErrorMessage(error instanceof Error ? error.message : "Unable to open Paddle checkout.");
                } finally {
                  setOpeningCheckout(false);
                }
              }}
              type="button"
            >
              {isOpeningCheckout ? (
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
              ) : (
                <ArrowRightIcon data-icon="inline-start" />
              )}
              Upgrade to {upgradePlan.name}
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
            Subscription credits
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {UsageMetrics.formatUsdFromNano(subscriptionWallet?.amountNanoUsd ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Remaining credits available to CompanyHelm-managed sessions.
          </p>
          {currentPlan ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Plan includes {UsageMetrics.formatUsdFromNano(currentPlan.monthlyCreditsNanoUsd)} in monthly credits.
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Next renewal: {formatTimestamp(props.billing.nextRechargeAt)}.
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
            Pay as you go credits
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {UsageMetrics.formatUsdFromNano(payAsYouGoWallet?.amountNanoUsd ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Credits available for usage outside the subscription wallet.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function findPlan(plans: ReadonlyArray<BillingPlanRecord>, key: string): BillingPlanRecord | null {
  return plans.find((plan) => plan.key === key) ?? null;
}

function findPlanName(plans: ReadonlyArray<BillingPlanRecord>, key: string): string {
  return findPlan(plans, key)?.name ?? key;
}

function resolveUpgradeUnavailableMessage(input: {
  hasClientToken: boolean;
  isCurrentPlanPro: boolean;
  isPendingPro: boolean;
  upgradePlan: BillingPlanRecord | null;
}): string | null {
  if (input.isCurrentPlanPro || input.isPendingPro) {
    return null;
  }
  if (!input.upgradePlan?.paddlePriceId || input.upgradePlan.paddlePriceId.includes("placeholder")) {
    return "Add the Paddle Pro price ID to the billing plan catalog to enable checkout.";
  }
  if (!input.hasClientToken) {
    return "Set VITE_PADDLE_CLIENT_TOKEN to enable Paddle checkout.";
  }

  return null;
}

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "an upcoming recharge";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}
