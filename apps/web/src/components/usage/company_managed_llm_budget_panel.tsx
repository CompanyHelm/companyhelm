import { Badge } from "@/components/ui/badge";
import { UsageMetrics } from "@/lib/usage_metrics";
import { cn } from "@/lib/utils";

type CompanyManagedLlmBudgetPeriodRecord = {
  exhausted: boolean;
  limitCostNanoUsd: number | null | undefined;
  overageCostNanoUsd: number;
  period: string;
  periodStart: string;
  remainingCostNanoUsd: number | null | undefined;
  usedCostNanoUsd: number;
};

export type CompanyManagedLlmBudgetRecord = {
  daily: CompanyManagedLlmBudgetPeriodRecord;
  managedCredentialId: string | null | undefined;
  monthly: CompanyManagedLlmBudgetPeriodRecord;
  plan: string;
};

type CompanyManagedLlmBudgetPanelProps = {
  budget: CompanyManagedLlmBudgetRecord;
  description?: string;
  title?: string;
};

type BudgetPeriodTileProps = {
  budget: CompanyManagedLlmBudgetPeriodRecord;
  title: string;
};

function BudgetPeriodTile(props: BudgetPeriodTileProps) {
  const limitCostNanoUsd = props.budget.limitCostNanoUsd ?? null;
  const percentUsed = limitCostNanoUsd && limitCostNanoUsd > 0
    ? Math.min(Math.round((props.budget.usedCostNanoUsd / limitCostNanoUsd) * 100), 100)
    : 0;
  const remainingCostNanoUsd = props.budget.remainingCostNanoUsd ?? null;
  const remainingLabel = remainingCostNanoUsd === null
    ? "Uncapped"
    : `${UsageMetrics.formatUsdFromNano(remainingCostNanoUsd)} left`;
  const supportingLabel = limitCostNanoUsd === null
    ? `${UsageMetrics.formatUsdFromNano(props.budget.usedCostNanoUsd)} used`
    : `${UsageMetrics.formatUsdFromNano(props.budget.usedCostNanoUsd)} used of ${UsageMetrics.formatUsdFromNano(limitCostNanoUsd)}`;
  const overageLabel = props.budget.overageCostNanoUsd > 0
    ? `${UsageMetrics.formatUsdFromNano(props.budget.overageCostNanoUsd)} over`
    : null;
  let badgeLabel = "Uncapped";
  if (limitCostNanoUsd !== null) {
    badgeLabel = props.budget.exhausted ? "Exhausted" : `${percentUsed}% used`;
  }

  return (
    <div className="rounded-lg border border-border/70 bg-background/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{props.title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-foreground">{remainingLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">{supportingLabel}</p>
        </div>
        <Badge variant={props.budget.exhausted ? "destructive" : "outline"}>
          {badgeLabel}
        </Badge>
      </div>

      {limitCostNanoUsd === null ? null : (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            aria-hidden="true"
            className={cn(
              "h-full rounded-full transition-[width]",
              props.budget.exhausted ? "bg-destructive" : "bg-primary",
            )}
            style={{
              width: `${percentUsed}%`,
            }}
          />
        </div>
      )}

      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">Used</p>
          <p className="font-medium text-foreground">{UsageMetrics.formatUsdFromNano(props.budget.usedCostNanoUsd)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{overageLabel ? "Overage" : "Remaining"}</p>
          <p className={cn("font-medium", overageLabel ? "text-destructive" : "text-foreground")}>
            {overageLabel ?? remainingLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Shows the managed CompanyHelm LLM allowance with the same plan and cap values enforced by the
 * API. It is shared between the company usage dashboard and the managed provider detail page so
 * users see consistent daily and monthly remaining spend in both places.
 */
export function CompanyManagedLlmBudgetPanel(props: CompanyManagedLlmBudgetPanelProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold tracking-normal text-foreground">
            {props.title ?? "CompanyHelm included usage"}
          </h2>
          <Badge variant="secondary">{formatPlanLabel(props.budget.plan)} plan</Badge>
          {props.budget.managedCredentialId ? (
            <Badge variant="outline">Managed provider</Badge>
          ) : (
            <Badge variant="warning">Not provisioned</Badge>
          )}
        </div>
        {props.description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">{props.description}</p>
        ) : null}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <BudgetPeriodTile budget={props.budget.daily} title="Daily included usage" />
        <BudgetPeriodTile budget={props.budget.monthly} title="Monthly included usage" />
      </div>
    </section>
  );
}

function formatPlanLabel(value: string): string {
  if (value === "free") {
    return "Free";
  }
  if (value === "pro") {
    return "Pro";
  }

  return value;
}
