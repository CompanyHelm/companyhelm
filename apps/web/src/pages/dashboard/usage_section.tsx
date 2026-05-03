import { Link } from "@tanstack/react-router";
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
import { UsageSectionPresenter } from "./usage_section_presenter";

type UsageSectionProps = {
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

function UsageSpendTile(props: {
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

/**
 * Condenses the richer usage page into one dashboard card so operators can see spend, request
 * volume, and token counts without leaving the operations overview.
 */
export function UsageSection(props: UsageSectionProps) {
  const organizationSlug = useCurrentOrganizationSlug();
  const currentDaySummary = UsageSectionPresenter.buildSpendSummary(props.currentDayUsage);
  const currentMonthSummary = UsageSectionPresenter.buildSpendSummary(props.currentMonthUsage);
  const totalSummary = UsageSectionPresenter.buildSpendSummary(props.totalUsage);

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
            LLM spend and token volume for {props.organizationName}.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-4">
          <UsageSpendTile
            description={currentDaySummary.supportingText}
            title="UTC day"
            value={currentDaySummary.spendValue}
          />
          <UsageSpendTile
            description={currentMonthSummary.supportingText}
            title="UTC month"
            value={currentMonthSummary.spendValue}
          />
          <UsageSpendTile
            description={totalSummary.supportingText}
            title="All-time"
            value={totalSummary.spendValue}
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
