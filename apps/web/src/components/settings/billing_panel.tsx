import { useState } from "react";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { config } from "@/config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaddleCheckout } from "@/lib/paddle_checkout";
import { cn } from "@/lib/utils";
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
  const [openingCheckoutPlanKey, setOpeningCheckoutPlanKey] = useState<string | null>(null);
  const subscriptionWallet = props.billing.wallets.find((wallet) => wallet.type === "subscription");
  const payAsYouGoWallet = props.billing.wallets.find((wallet) => wallet.type === "pay_as_you_go");
  const currentPlan = findPlan(props.plans, props.billing.currentPlan);
  const pendingPlanLabel = props.billing.pendingPlan ? findPlanName(props.plans, props.billing.pendingPlan) : null;

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
        <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                Plans
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {currentPlan?.name ?? props.billing.currentPlan} subscription
              </p>
            </div>
            {pendingPlanLabel && props.billing.pendingPlanEffectiveAt ? (
              <Badge className="w-fit" variant="warning">
                Changes to {pendingPlanLabel} on {formatTimestamp(props.billing.pendingPlanEffectiveAt)}
              </Badge>
            ) : null}
          </div>
          {checkoutErrorMessage ? (
            <p className="mt-3 text-xs text-destructive">{checkoutErrorMessage}</p>
          ) : null}

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {props.plans.map((plan) => {
              const planAction = resolvePlanAction({
                currentPlan,
                hasClientToken: config.paddle.clientToken.length > 0,
                isOpeningCheckout: openingCheckoutPlanKey === plan.key,
                pendingPlanKey: props.billing.pendingPlan ?? null,
                plan,
              });

              return (
                <Card
                  className={cn(
                    "min-h-56 border-border/70 ring-0",
                    planAction.kind === "current" && "border-primary/40 bg-primary/5",
                  )}
                  key={plan.key}
                  size="sm"
                >
                  <CardHeader className="grid grid-cols-[1fr_auto] gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                      <p className="mt-1 text-xs/relaxed text-muted-foreground">{plan.description}</p>
                    </div>
                    {planAction.kind === "current" ? (
                      <Badge className="shrink-0" variant="default">Current</Badge>
                    ) : planAction.kind === "pending" ? (
                      <Badge className="shrink-0" variant="warning">Scheduled</Badge>
                    ) : null}
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-2xl font-semibold tracking-tight text-foreground">
                        {formatPlanPrice(plan)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {UsageMetrics.formatUsdFromNano(plan.monthlyCreditsNanoUsd)} managed-model credits monthly
                      </p>
                    </div>

                    <div className="mt-auto flex flex-col gap-2">
                      {planAction.note ? (
                        <p className="min-h-8 text-xs/relaxed text-muted-foreground">{planAction.note}</p>
                      ) : (
                        <span className="min-h-8" />
                      )}
                      <Button
                        className="w-full"
                        disabled={planAction.disabled}
                        onClick={() => {
                          void openPlanCheckout({
                            companyId: props.companyId,
                            onError: setCheckoutErrorMessage,
                            onOpeningPlanChange: setOpeningCheckoutPlanKey,
                            plan,
                          });
                        }}
                        type="button"
                        variant={planAction.kind === "downgrade" ? "outline" : "default"}
                      >
                        {planAction.isLoading ? (
                          <Loader2Icon className="animate-spin" data-icon="inline-start" />
                        ) : planAction.kind === "upgrade" ? (
                          <ArrowRightIcon data-icon="inline-start" />
                        ) : null}
                        {planAction.label}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
              Current plan
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">{currentPlan?.name ?? props.billing.currentPlan}</p>
            {currentPlan ? (
              <p className="mt-1 text-xs text-muted-foreground">{currentPlan.description}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Next renewal: {formatTimestamp(props.billing.nextRechargeAt)}.
            </p>
          </div>
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

type PlanAction = {
  disabled: boolean;
  isLoading: boolean;
  kind: "current" | "downgrade" | "pending" | "unavailable" | "upgrade";
  label: string;
  note: string | null;
};

function resolvePlanAction(input: {
  currentPlan: BillingPlanRecord | null;
  hasClientToken: boolean;
  isOpeningCheckout: boolean;
  pendingPlanKey: string | null;
  plan: BillingPlanRecord;
}): PlanAction {
  if (input.plan.key === input.currentPlan?.key) {
    return {
      disabled: true,
      isLoading: false,
      kind: "current",
      label: "Current plan",
      note: "This is the active subscription for the workspace.",
    };
  }
  if (input.plan.key === input.pendingPlanKey) {
    return {
      disabled: true,
      isLoading: false,
      kind: "pending",
      label: "Scheduled",
      note: "This plan change is already scheduled for the next billing period.",
    };
  }

  const currentPriceCents = input.currentPlan?.priceCents ?? 0;
  if (input.plan.priceCents < currentPriceCents) {
    return {
      disabled: true,
      isLoading: false,
      kind: "downgrade",
      label: `Downgrade to ${input.plan.name}`,
      note: "Downgrades will be scheduled here after the billing plan-change mutation is added.",
    };
  }

  if (!input.plan.paddlePriceId || input.plan.paddlePriceId.includes("placeholder")) {
    return {
      disabled: true,
      isLoading: false,
      kind: "unavailable",
      label: `Upgrade to ${input.plan.name}`,
      note: "Add the Paddle price ID to the billing plan catalog to enable checkout.",
    };
  }
  if (!input.hasClientToken) {
    return {
      disabled: true,
      isLoading: false,
      kind: "unavailable",
      label: `Upgrade to ${input.plan.name}`,
      note: "Set VITE_PADDLE_CLIENT_TOKEN to enable Paddle checkout.",
    };
  }

  return {
    disabled: input.isOpeningCheckout,
    isLoading: input.isOpeningCheckout,
    kind: "upgrade",
    label: `Upgrade to ${input.plan.name}`,
    note: "Checkout opens with Paddle and access changes after webhook confirmation.",
  };
}

async function openPlanCheckout(input: {
  companyId: string;
  onError(message: string | null): void;
  onOpeningPlanChange(planKey: string | null): void;
  plan: BillingPlanRecord;
}): Promise<void> {
  if (!input.plan.paddlePriceId || input.plan.paddlePriceId.includes("placeholder")) {
    return;
  }

  input.onError(null);
  input.onOpeningPlanChange(input.plan.key);
  try {
    await PaddleCheckout.open({
      clientToken: config.paddle.clientToken,
      companyId: input.companyId,
      environment: config.paddle.environment,
      planKey: input.plan.key,
      priceId: input.plan.paddlePriceId,
    });
  } catch (error) {
    input.onError(error instanceof Error ? error.message : "Unable to open Paddle checkout.");
  } finally {
    input.onOpeningPlanChange(null);
  }
}

function formatPlanPrice(plan: BillingPlanRecord): string {
  if (plan.priceCents === 0) {
    return "Free";
  }

  const dollars = plan.priceCents / 100;
  const formattedPrice = new Intl.NumberFormat("en-US", {
    currency: plan.currencyCode,
    maximumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    style: "currency",
  }).format(dollars);
  return `${formattedPrice}/mo`;
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
