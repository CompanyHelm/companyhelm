import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageMetrics } from "@/lib/usage_metrics";

export type BillingRecord = {
  currentPlan: string;
  pendingPlan: string | null | undefined;
  pendingPlanEffectiveAt: string | null | undefined;
  wallets: ReadonlyArray<{
    amountNanoUsd: number;
    type: string;
  }>;
};

type BillingPanelProps = {
  billing: BillingRecord;
};

/**
 * Summarizes the active subscription plan and remaining subscription credits inside settings so
 * billing state lives alongside the rest of the company configuration surface.
 */
export function BillingPanel(props: BillingPanelProps) {
  const subscriptionWallet = props.billing.wallets.find((wallet) => wallet.type === "subscription");
  const pendingPlanLabel = props.billing.pendingPlan ? formatPlanLabel(props.billing.pendingPlan) : null;

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
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
            Current plan
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">{formatPlanLabel(props.billing.currentPlan)}</p>
          {pendingPlanLabel && props.billing.pendingPlanEffectiveAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Changes to {pendingPlanLabel} on {formatTimestamp(props.billing.pendingPlanEffectiveAt)}.
            </p>
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
        </div>
      </CardContent>
    </Card>
  );
}

function formatPlanLabel(plan: string): string {
  return plan === "pro" ? "Pro" : "Free";
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
