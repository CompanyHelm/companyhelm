import { Badge } from "@/components/ui/badge";
import { UsageMetrics, type UsageAggregateRecord } from "@/lib/usage_metrics";

type UsageSummaryPanelProps = {
  aggregates: ReadonlyArray<UsageAggregateRecord>;
  description: string;
  scopeId: string;
  scopeType: string;
  title: string;
};

type UsageStatTileProps = {
  label: string;
  value: string;
  supportingText: string;
};

type UsageBarChartProps = {
  emptyLabel: string;
  metric: "cost" | "tokens";
  period: "day" | "month";
  rows: ReadonlyArray<UsageAggregateRecord>;
  title: string;
};

function UsageStatTile(props: UsageStatTileProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/80 p-4">
      <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-foreground">{props.value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{props.supportingText}</p>
    </div>
  );
}

function UsageBarChart(props: UsageBarChartProps) {
  const visibleRows = props.rows.slice(-12);
  const maxValue = Math.max(
    ...visibleRows.map((row) => props.metric === "cost" ? row.totalCostNanoUsd : row.totalTokens),
    0,
  );

  return (
    <section className="rounded-lg border border-border/70 bg-background/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{props.title}</h3>
        <Badge variant="outline">{props.period === "day" ? "UTC days" : "UTC months"}</Badge>
      </div>

      {visibleRows.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {props.emptyLabel}
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {visibleRows.map((row) => {
            const value = props.metric === "cost" ? row.totalCostNanoUsd : row.totalTokens;
            const formattedValue = props.metric === "cost"
              ? UsageMetrics.formatUsdFromNano(row.totalCostNanoUsd)
              : UsageMetrics.formatTokenCount(row.totalTokens);

            return (
              <div key={`${row.period}-${row.periodStart}`} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {UsageMetrics.formatPeriodLabel(row.periodStart, props.period)}
                  </span>
                  <span className="shrink-0 font-medium text-foreground">{formattedValue}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    aria-hidden="true"
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{
                      width: UsageMetrics.resolveBarWidth(value, maxValue),
                    }}
                  />
                </div>
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
 * favors compact financial and token cards above short UTC-period bar charts so cost anomalies are
 * visible without forcing users into raw event data.
 */
export function UsageSummaryPanel(props: UsageSummaryPanelProps) {
  const total = UsageMetrics.findTotalAggregate(props.aggregates, props.scopeType, props.scopeId);
  const dayRows = UsageMetrics.filterPeriodAggregates(props.aggregates, "day");
  const monthRows = UsageMetrics.filterPeriodAggregates(props.aggregates, "month");

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold tracking-normal text-foreground">{props.title}</h2>
          <Badge variant="secondary">{UsageMetrics.formatRequestCount(total.requestCount)} requests</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">{props.description}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <UsageStatTile
          label="Total spend"
          supportingText="Input, output, and cache costs"
          value={UsageMetrics.formatUsdFromNano(total.totalCostNanoUsd)}
        />
        <UsageStatTile
          label="Total tokens"
          supportingText={`${UsageMetrics.formatTokenCount(total.inputTokens)} input, ${UsageMetrics.formatTokenCount(total.outputTokens)} output`}
          value={UsageMetrics.formatTokenCount(total.totalTokens)}
        />
        <UsageStatTile
          label="Cache tokens"
          supportingText={`${UsageMetrics.formatTokenCount(total.cacheReadTokens)} read, ${UsageMetrics.formatTokenCount(total.cacheWriteTokens)} write`}
          value={UsageMetrics.formatTokenCount(total.cacheReadTokens + total.cacheWriteTokens)}
        />
        <UsageStatTile
          label="Requests"
          supportingText="Assistant usage writes"
          value={UsageMetrics.formatRequestCount(total.requestCount)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <UsageBarChart
          emptyLabel="No daily usage recorded yet."
          metric="cost"
          period="day"
          rows={dayRows}
          title="Daily spend"
        />
        <UsageBarChart
          emptyLabel="No monthly usage recorded yet."
          metric="tokens"
          period="month"
          rows={monthRows}
          title="Monthly tokens"
        />
      </div>
    </section>
  );
}
