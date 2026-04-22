import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageTabs } from "@/components/ui/page_tabs";
import { UsageMetrics, type UsageAggregateRecord } from "@/lib/usage_metrics";
import { cn } from "@/lib/utils";

type UsageMetricView = "tokens" | "spend";

type UsageSummaryPanelProps = {
  aggregates: ReadonlyArray<UsageAggregateRecord>;
  description: string;
  scopeId: string;
  scopeType: string;
  title: string;
};

type UsageStatTileProps = {
  label: string;
  supportingText: string;
  value: string;
};

type UsageDailyBarChartProps = {
  emptyLabel: string;
  metric: UsageMetricView;
  rows: ReadonlyArray<UsageAggregateRecord>;
  title: string;
};

function UsageStatTile(props: UsageStatTileProps) {
  return (
    <div className="min-h-28 rounded-lg border border-border/70 bg-background/80 p-4">
      <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-foreground">{props.value}</p>
      <p className="mt-1 text-xs/relaxed text-muted-foreground">{props.supportingText}</p>
    </div>
  );
}

function UsageDailyBarChart(props: UsageDailyBarChartProps) {
  const maxValue = Math.max(...props.rows.map((row) => resolveMetricValue(row, props.metric)), 0);
  const hasUsage = maxValue > 0;

  return (
    <section className="rounded-lg border border-border/70 bg-background/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{props.title}</h3>
        <Badge variant="outline">Last 30 UTC days</Badge>
      </div>

      {!hasUsage ? (
        <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {props.emptyLabel}
        </div>
      ) : (
        <div
          aria-label={props.title}
          className="mt-4 flex h-56 items-end gap-1 overflow-x-auto rounded-lg border border-border/60 bg-muted/20 p-3"
          role="list"
        >
          {props.rows.map((row, index) => {
            const value = resolveMetricValue(row, props.metric);
            const formattedValue = formatMetricValue(row, props.metric);
            const dateLabel = UsageMetrics.formatPeriodLabel(row.periodStart, "day");
            const showAxisLabel = index === 0 || index === props.rows.length - 1 || index % 5 === 0;

            return (
              <div
                aria-label={`${dateLabel}: ${formattedValue}`}
                className="flex min-w-4 flex-1 flex-col justify-end gap-2"
                key={row.periodStart}
                role="listitem"
              >
                <div className="flex h-40 items-end">
                  <div
                    aria-hidden="true"
                    className={cn(
                      "w-full rounded-t-sm transition-[height]",
                      props.metric === "tokens" ? "bg-primary" : "bg-primary/80",
                    )}
                    style={{
                      height: UsageMetrics.resolveBarPercentage(value, maxValue),
                    }}
                    title={`${dateLabel}: ${formattedValue}`}
                  />
                </div>
                <span className="h-4 text-center text-[10px] leading-4 text-muted-foreground">
                  {showAxisLabel ? formatDailyAxisLabel(row.periodStart) : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * Renders the repeated LLM usage dashboard block used by company, provider, and agent pages. It
 * separates token volume from spend while keeping the same current-day, current-month, and daily
 * trend math across every usage surface.
 */
export function UsageSummaryPanel(props: UsageSummaryPanelProps) {
  const [selectedMetric, setSelectedMetric] = useState<UsageMetricView>("tokens");
  const total = UsageMetrics.findTotalAggregate(props.aggregates, props.scopeType, props.scopeId);
  const today = UsageMetrics.findCurrentDayAggregate(props.aggregates, props.scopeType, props.scopeId);
  const currentMonth = UsageMetrics.findCurrentMonthAggregate(props.aggregates, props.scopeType, props.scopeId);
  const dailyRows = useMemo(() => {
    return UsageMetrics.buildRecentDailyAggregates(props.aggregates, props.scopeType, props.scopeId, 30);
  }, [props.aggregates, props.scopeId, props.scopeType]);
  const metricNoun = selectedMetric === "tokens" ? "tokens" : "spend";

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold tracking-normal text-foreground">{props.title}</h2>
          <Badge variant="secondary">{UsageMetrics.formatRequestCount(total.requestCount)} requests</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">{props.description}</p>
        <PageTabs
          className="border-b-0"
          items={[
            {
              key: "tokens" as const,
              label: "Tokens",
            },
            {
              key: "spend" as const,
              label: "Spend",
            },
          ]}
          onSelect={setSelectedMetric}
          selectedKey={selectedMetric}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <UsageStatTile
          label={selectedMetric === "tokens" ? "Tokens today" : "Spend today"}
          supportingText={formatMetricSupportingText(today, selectedMetric)}
          value={formatMetricValue(today, selectedMetric)}
        />
        <UsageStatTile
          label={selectedMetric === "tokens" ? "Tokens this month" : "Spend this month"}
          supportingText={formatMetricSupportingText(currentMonth, selectedMetric)}
          value={formatMetricValue(currentMonth, selectedMetric)}
        />
        <UsageStatTile
          label={selectedMetric === "tokens" ? "All-time tokens" : "All-time spend"}
          supportingText={formatMetricSupportingText(total, selectedMetric)}
          value={formatMetricValue(total, selectedMetric)}
        />
      </div>

      <UsageDailyBarChart
        emptyLabel={`No daily ${metricNoun} recorded over the past month.`}
        metric={selectedMetric}
        rows={dailyRows}
        title={`Daily ${metricNoun}`}
      />
    </section>
  );
}

function resolveMetricValue(aggregate: UsageAggregateRecord, metric: UsageMetricView): number {
  return metric === "tokens" ? aggregate.totalTokens : aggregate.totalCostNanoUsd;
}

function formatMetricValue(aggregate: UsageAggregateRecord, metric: UsageMetricView): string {
  if (metric === "tokens") {
    return UsageMetrics.formatTokenCount(aggregate.totalTokens);
  }

  return UsageMetrics.formatUsdFromNano(aggregate.totalCostNanoUsd);
}

function formatMetricSupportingText(aggregate: UsageAggregateRecord, metric: UsageMetricView): string {
  if (metric === "tokens") {
    return `${UsageMetrics.formatTokenCount(aggregate.inputTokens)} input, ${UsageMetrics.formatTokenCount(aggregate.outputTokens)} output`;
  }

  return `${UsageMetrics.formatRequestCount(aggregate.requestCount)} requests`;
}

function formatDailyAxisLabel(periodStart: string): string {
  const date = new Date(periodStart);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return String(date.getUTCDate());
}
