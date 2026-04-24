import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { type UsageAggregateRecord, UsageMetrics } from "@/lib/usage_metrics";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";

type CompanyManagedLlmBudgetPeriodRecord = {
  exhausted: boolean;
  limitCostNanoUsd: number | null | undefined;
  overageCostNanoUsd: number;
  period: string;
  periodStart: string;
  remainingCostNanoUsd: number | null | undefined;
  usedCostNanoUsd: number;
};

type CompanyManagedLlmBudgetRecord = {
  daily: CompanyManagedLlmBudgetPeriodRecord;
  managedCredentialId: string | null | undefined;
  monthly: CompanyManagedLlmBudgetPeriodRecord;
  plan: string;
};

type UsageSectionProps = {
  budget: CompanyManagedLlmBudgetRecord;
  currentDayUsage: UsageAggregateRecord;
  currentMonthUsage: UsageAggregateRecord;
  organizationName: string;
  totalUsage: UsageAggregateRecord;
};

function UsageMetricTile(props: {
  description: string;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {props.title}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{props.value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{props.description}</p>
    </div>
  );
}

function formatRemainingLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Uncapped";
  }

  return `${UsageMetrics.formatUsdFromNano(value)} left`;
}

function formatPlanLabel(plan: string): string {
  if (plan === "free") {
    return "Free";
  }
  if (plan === "pro") {
    return "Pro";
  }

  return plan;
}

/**
 * Condenses the richer usage page into one dashboard card so operators can see spend, request
 * volume, and remaining managed budget without leaving the operations overview.
 */
export function UsageSection(props: UsageSectionProps) {
  const organizationSlug = useCurrentOrganizationSlug();

  return (
    <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader className="gap-3">
        <CardAction>
          <Link
            className="text-xs font-medium text-primary hover:underline"
            params={{ organizationSlug }}
            to={OrganizationPath.route("/usage")}
          >
            Open usage
          </Link>
        </CardAction>
        <div className="space-y-1">
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            LLM spend and CompanyHelm-managed budget for {props.organizationName}.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{formatPlanLabel(props.budget.plan)} plan</Badge>
          <Badge variant={props.budget.managedCredentialId ? "outline" : "warning"}>
            {props.budget.managedCredentialId ? "Managed provider ready" : "Managed provider missing"}
          </Badge>
          <Badge variant={props.budget.daily.exhausted ? "destructive" : "outline"}>
            Daily budget: {formatRemainingLabel(props.budget.daily.remainingCostNanoUsd)}
          </Badge>
          <Badge variant={props.budget.monthly.exhausted ? "destructive" : "outline"}>
            Monthly budget: {formatRemainingLabel(props.budget.monthly.remainingCostNanoUsd)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-4">
          <UsageMetricTile
            description={`${UsageMetrics.formatRequestCount(props.currentDayUsage.requestCount)} requests • ${UsageMetrics.formatTokenBreakdown(props.currentDayUsage)}`}
            title="UTC day spend"
            value={UsageMetrics.formatUsdFromNano(UsageMetrics.resolveCombinedCostNanoUsd(props.currentDayUsage))}
          />
          <UsageMetricTile
            description={`${UsageMetrics.formatRequestCount(props.currentMonthUsage.requestCount)} requests • ${UsageMetrics.formatTokenBreakdown(props.currentMonthUsage)}`}
            title="UTC month spend"
            value={UsageMetrics.formatUsdFromNano(UsageMetrics.resolveCombinedCostNanoUsd(props.currentMonthUsage))}
          />
          <UsageMetricTile
            description={`${UsageMetrics.formatRequestCount(props.totalUsage.requestCount)} requests • ${UsageMetrics.formatTokenBreakdown(props.totalUsage)}`}
            title="All-time spend"
            value={UsageMetrics.formatUsdFromNano(UsageMetrics.resolveCombinedCostNanoUsd(props.totalUsage))}
          />
          <UsageMetricTile
            description={`${UsageMetrics.formatTokenCount(props.totalUsage.totalTokens)} tokens processed`}
            title="All-time requests"
            value={UsageMetrics.formatRequestCount(props.totalUsage.requestCount)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
