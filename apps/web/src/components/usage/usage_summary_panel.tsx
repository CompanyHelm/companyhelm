import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageTabs } from "@/components/ui/page_tabs";
import { UsageMetrics, type UsageAggregateRecord } from "@/lib/usage_metrics";
import { cn } from "@/lib/utils";

type UsageMetricView = "actual_spend" | "tokens" | "virtual_spend";
type UsageSpendKind = "actual" | "split" | "virtual";

type UsageSummaryPanelProps = {
  aggregates: ReadonlyArray<UsageAggregateRecord>;
  description: string;
  scopeId: string;
  scopeType: string;
  spendKind?: UsageSpendKind;
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
  spendNoun: string;
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
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const maxValue = Math.max(...props.rows.map((row) => resolveMetricValue(row, props.metric)), 0);
  const hasUsage = maxValue > 0;
  const activeRow = typeof activeRowIndex === "number" ? props.rows[activeRowIndex] : null;

  return (
    <section className="rounded-lg border border-border/70 bg-background/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{props.title}</h3>
        <Badge variant="outline">Last 30 days (UTC)</Badge>
      </div>

      {!hasUsage ? (
        <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {props.emptyLabel}
        </div>
      ) : (
        <div
          aria-label={props.title}
          className="relative mt-4 flex h-64 items-end gap-1 overflow-x-auto rounded-lg border border-border/60 bg-muted/20 p-3 pt-16"
          onPointerLeave={() => {
            setActiveRowIndex(null);
          }}
          role="list"
        >
          {activeRow ? (
            <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border/70 bg-background px-3 py-2 text-xs shadow-sm">
              <p className="font-medium text-foreground">{formatDailyTooltipDate(activeRow.periodStart)}</p>
              <p className="mt-1 text-muted-foreground">
                {formatMetricValue(activeRow, props.metric)} {props.metric === "tokens" ? "tokens" : props.spendNoun}
              </p>
              <p className="mt-1 text-muted-foreground">
                {formatDailyTooltipDetail(activeRow, props.metric)}
              </p>
              <p className="mt-1 text-muted-foreground">
                {UsageMetrics.formatRequestCount(activeRow.requestCount)} requests
              </p>
            </div>
          ) : null}
          {props.rows.map((row, index) => {
            const value = resolveMetricValue(row, props.metric);
            const formattedValue = formatMetricValue(row, props.metric);
            const dateLabel = UsageMetrics.formatPeriodLabel(row.periodStart, "day");
            const showAxisLabel = index === 0 || index === props.rows.length - 1 || index % 5 === 0;
            const isActive = activeRowIndex === index;

            return (
              <div
                aria-label={`${dateLabel}: ${formattedValue}`}
                className="relative flex min-w-4 flex-1 flex-col justify-end gap-2 outline-none"
                key={row.periodStart}
                onBlur={() => {
                  setActiveRowIndex(null);
                }}
                onFocus={() => {
                  setActiveRowIndex(index);
                }}
                onPointerEnter={() => {
                  setActiveRowIndex(index);
                }}
                role="listitem"
                tabIndex={0}
              >
                {isActive ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/70"
                  />
                ) : null}
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
                <span className="flex h-7 flex-col items-center justify-start gap-0.5 text-center text-[10px] leading-none text-muted-foreground">
                  {showAxisLabel ? (
                    <>
                      <span>{formatDailyAxisLabel(row.periodStart)}</span>
                      <span className="text-[9px]">UTC</span>
                    </>
                  ) : null}
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
 * separates token volume from actual and virtual spend while keeping the same current-day,
 * current-month, and daily trend math across every usage surface.
 */
export function UsageSummaryPanel(props: UsageSummaryPanelProps) {
  const [selectedMetric, setSelectedMetric] = useState<UsageMetricView>("tokens");
  const total = UsageMetrics.findTotalAggregate(props.aggregates, props.scopeType, props.scopeId);
  const today = UsageMetrics.findCurrentDayAggregate(props.aggregates, props.scopeType, props.scopeId);
  const currentMonth = UsageMetrics.findCurrentMonthAggregate(props.aggregates, props.scopeType, props.scopeId);
  const dailyRows = useMemo(() => {
    return UsageMetrics.buildRecentDailyAggregates(props.aggregates, props.scopeType, props.scopeId, 30);
  }, [props.aggregates, props.scopeId, props.scopeType]);
  const spendKind = props.spendKind ?? "split";
  const chartNoun = resolveMetricNoun(selectedMetric);

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
          items={resolveTabItems(spendKind)}
          onSelect={setSelectedMetric}
          selectedKey={selectedMetric}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <UsageStatTile
          label={resolveMetricTileLabel(selectedMetric, "today")}
          supportingText={formatMetricSupportingText(today, selectedMetric, spendKind)}
          value={formatMetricValue(today, selectedMetric)}
        />
        <UsageStatTile
          label={resolveMetricTileLabel(selectedMetric, "this month")}
          supportingText={formatMetricSupportingText(currentMonth, selectedMetric, spendKind)}
          value={formatMetricValue(currentMonth, selectedMetric)}
        />
        <UsageStatTile
          label={resolveMetricTileLabel(selectedMetric, "all-time")}
          supportingText={formatMetricSupportingText(total, selectedMetric, spendKind)}
          value={formatMetricValue(total, selectedMetric)}
        />
      </div>

      <UsageDailyBarChart
        emptyLabel={`No daily ${chartNoun} recorded over the past month.`}
        metric={selectedMetric}
        rows={dailyRows}
        spendNoun={chartNoun}
        title={`Daily ${chartNoun}`}
      />
    </section>
  );
}

function formatDailyTooltipDate(periodStart: string): string {
  const date = new Date(periodStart);
  if (Number.isNaN(date.getTime())) {
    return "Unknown day";
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);

  return `${formattedDate} (UTC)`;
}

function formatDailyTooltipDetail(aggregate: UsageAggregateRecord, metric: UsageMetricView): string {
  if (metric === "tokens") {
    return UsageMetrics.formatTokenBreakdown(aggregate);
  }

  return metric === "virtual_spend"
    ? "Subscription-equivalent virtual spend"
    : "Provider-billed spend";
}

function resolveMetricValue(aggregate: UsageAggregateRecord, metric: UsageMetricView): number {
  if (metric === "tokens") {
    return aggregate.totalTokens;
  }
  if (metric === "virtual_spend") {
    return aggregate.totalCostNanoVirtualUsd;
  }

  return aggregate.totalCostNanoUsd;
}

function formatMetricValue(aggregate: UsageAggregateRecord, metric: UsageMetricView): string {
  if (metric === "tokens") {
    return UsageMetrics.formatTokenCount(aggregate.totalTokens);
  }

  return UsageMetrics.formatUsdFromNano(resolveMetricValue(aggregate, metric));
}

function formatMetricSupportingText(
  aggregate: UsageAggregateRecord,
  metric: UsageMetricView,
  spendKind: UsageSpendKind,
): string {
  if (metric === "tokens") {
    return UsageMetrics.formatTokenBreakdown(aggregate);
  }

  const requestsLabel = `${UsageMetrics.formatRequestCount(aggregate.requestCount)} requests`;
  if (resolveSelectedSpendKind(metric, spendKind) === "virtual") {
    return `${requestsLabel}, subscription-equivalent virtual spend`;
  }

  return `${requestsLabel}, provider-billed spend`;
}

function formatDailyAxisLabel(periodStart: string): string {
  const date = new Date(periodStart);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return String(date.getUTCDate());
}

function resolveTabItems(spendKind: UsageSpendKind): Array<{ key: UsageMetricView; label: string }> {
  if (spendKind === "actual") {
    return [{ key: "tokens", label: "Tokens" }, { key: "actual_spend", label: "Spend" }];
  }
  if (spendKind === "virtual") {
    return [{ key: "tokens", label: "Tokens" }, { key: "virtual_spend", label: "Virtual spend" }];
  }

  return [
    { key: "tokens", label: "Tokens" },
    { key: "actual_spend", label: "Spend" },
    { key: "virtual_spend", label: "Virtual spend" },
  ];
}

function resolveMetricNoun(metric: UsageMetricView): string {
  if (metric === "tokens") {
    return "tokens";
  }

  return metric === "virtual_spend" ? "virtual spend" : "spend";
}

function resolveMetricTileLabel(metric: UsageMetricView, timeframe: "all-time" | "this month" | "today"): string {
  if (metric === "tokens") {
    return timeframe === "all-time" ? "All-time tokens" : `Tokens ${timeframe}`;
  }

  const noun = capitalizeLabel(resolveMetricNoun(metric));
  return timeframe === "all-time" ? `All-time ${resolveMetricNoun(metric)}` : `${noun} ${timeframe}`;
}

function resolveSelectedSpendKind(metric: UsageMetricView, spendKind: UsageSpendKind): UsageSpendKind {
  if (metric === "virtual_spend") {
    return "virtual";
  }
  if (metric === "actual_spend") {
    return "actual";
  }

  return spendKind;
}

function capitalizeLabel(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
