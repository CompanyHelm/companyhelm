import { Suspense, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { graphql, useLazyLoadQuery } from "react-relay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EnvironmentMetricWindow, type EnvironmentMetricWindowRange } from "./environment_metric_window";
import type { environmentMetricsTabQuery } from "./__generated__/environmentMetricsTabQuery.graphql";

type MetricsTabKey = "cpuUsedPct" | "memUsedBytes" | "diskUsedBytes";

const metricsRefreshIntervalMilliseconds = 60_000;

interface EnvironmentMetricsTabProps {
  diskSpaceGb: number;
  environmentId: string;
  memoryGb: number;
}

interface EnvironmentMetricsTabContentProps {
  diskSpaceGb: number;
  environmentId: string;
  memoryGb: number;
  metricWindow: EnvironmentMetricWindowRange;
}

interface EnvironmentMetricsChartProps {
  diskSpaceGb: number;
  memoryGb: number;
  samples: ReadonlyArray<{
    cpuUsedPct: number | null | undefined;
    diskUsedBytes: number | null | undefined;
    memUsedBytes: number | null | undefined;
    sampledAt: string;
  }>;
}

type MetricChartDefinition = {
  gradientId: string;
  key: MetricsTabKey;
  label: string;
};

type MetricChartCapacity = {
  diskUsedBytes: number;
  memUsedBytes: number;
};

const environmentMetricsTabQueryNode = graphql`
  query environmentMetricsTabQuery($environmentId: ID!, $startTime: String!, $endTime: String!) {
    EnvironmentMetricSamples(environmentId: $environmentId, startTime: $startTime, endTime: $endTime) {
      sampledAt
      cpuUsedPct
      memUsedBytes
      diskUsedBytes
    }
  }
`;

const chartConfig: ChartConfig = {
  cpuUsedPct: {
    color: "hsl(213 92% 48%)",
    label: "CPU used %",
  },
  diskUsedBytes: {
    color: "hsl(213 92% 48%)",
    label: "Disk used",
  },
  memUsedBytes: {
    color: "hsl(213 92% 48%)",
    label: "Memory used",
  },
};

const metricChartDefinitions: ReadonlyArray<MetricChartDefinition> = [
  { gradientId: "environmentMetricCpuFill", key: "cpuUsedPct", label: "CPU used %" },
  { gradientId: "environmentMetricMemoryFill", key: "memUsedBytes", label: "Memory used" },
  { gradientId: "environmentMetricDiskFill", key: "diskUsedBytes", label: "Disk used" },
];

function formatTimestampLabel(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatBytes(value: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = value;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${amount.toFixed(amount >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatMetricValue(metricKey: MetricsTabKey, value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (metricKey === "cpuUsedPct") {
    return `${value.toFixed(1)}%`;
  }

  return formatBytes(value);
}

function formatAxisTick(metricKey: MetricsTabKey, value: number): string {
  if (metricKey === "cpuUsedPct") {
    return `${Math.round(value)}%`;
  }

  return formatBytes(value);
}

function formatTooltipValue(dataKey: string, value: number | string | undefined): string {
  if (typeof value !== "number") {
    return String(value ?? "—");
  }

  if (dataKey === "cpuUsedPct" || dataKey === "memUsedBytes" || dataKey === "diskUsedBytes") {
    return formatMetricValue(dataKey, value);
  }

  return value.toLocaleString();
}

function gigabytesToBytes(value: number): number {
  return value * 1024 * 1024 * 1024;
}

function hasMetricValue(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

function resolveMetricDomain(
  metricKey: MetricsTabKey,
  capacity: MetricChartCapacity,
): [number, number | "auto"] {
  if (metricKey === "cpuUsedPct") {
    return [0, 100];
  }

  if (metricKey === "memUsedBytes") {
    return [0, capacity.memUsedBytes];
  }

  return [0, capacity.diskUsedBytes];
}

/**
 * Renders the last hour of environment usage as stacked charts so operators can compare CPU,
 * memory, and disk without switching context between incompatible units.
 */
function EnvironmentMetricsChart(props: EnvironmentMetricsChartProps) {
  const capacity = useMemo(
    () => ({
      diskUsedBytes: gigabytesToBytes(props.diskSpaceGb),
      memUsedBytes: gigabytesToBytes(props.memoryGb),
    }),
    [props.diskSpaceGb, props.memoryGb],
  );
  const chartData = useMemo(() => {
    return props.samples.map((sample) => ({
      cpuUsedPct: sample.cpuUsedPct,
      diskUsedBytes: sample.diskUsedBytes,
      label: formatTimestampLabel(sample.sampledAt),
      memUsedBytes: sample.memUsedBytes,
      sampledAt: sample.sampledAt,
    }));
  }, [props.samples]);

  if (props.samples.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No metrics yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Minute-level samples will appear here after the worker records usage for this environment.
        </p>
      </div>
    );
  }

  const latestSample = props.samples[props.samples.length - 1] ?? null;

  return (
    <div className="grid gap-6 px-4">
      <div className="grid gap-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Last 60 minutes</h2>
        <p className="text-sm text-muted-foreground">Minute-bucketed environment usage captured by the metrics worker.</p>
      </div>

      <div className="grid gap-4">
        {metricChartDefinitions.map((definition) => {
          const latestMetricValue = latestSample && hasMetricValue(latestSample[definition.key])
            ? latestSample[definition.key]
            : null;

          return (
            <Card key={definition.key}>
              <CardHeader>
                <div className="grid gap-1">
                  <CardDescription>{definition.label}</CardDescription>
                  <CardTitle>{formatMetricValue(definition.key, latestMetricValue)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-56 w-full" config={chartConfig}>
                  <AreaChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
                    <defs>
                      <linearGradient id={definition.gradientId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor={`var(--color-${definition.key})`} stopOpacity={0.34} />
                        <stop offset="95%" stopColor={`var(--color-${definition.key})`} stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" minTickGap={24} tickLine={false} tickMargin={8} />
                    <YAxis
                      axisLine={false}
                      domain={resolveMetricDomain(definition.key, capacity)}
                      tickFormatter={(value: number) => formatAxisTick(definition.key, value)}
                      tickLine={false}
                      tickMargin={8}
                      width={72}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatValue={formatTooltipValue} hideLabel indicator="line" />}
                      cursor={false}
                    />
                    <Area
                      dataKey={definition.key}
                      fill={`url(#${definition.gradientId})`}
                      fillOpacity={1}
                      isAnimationActive={false}
                      stroke={`var(--color-${definition.key})`}
                      strokeWidth={2}
                      type="monotone"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function EnvironmentMetricsTabFallback() {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
      Loading metrics...
    </div>
  );
}

function EnvironmentMetricsTabContent(props: EnvironmentMetricsTabContentProps) {
  const data = useLazyLoadQuery<environmentMetricsTabQuery>(
    environmentMetricsTabQueryNode,
    {
      endTime: props.metricWindow.endTime,
      environmentId: props.environmentId,
      startTime: props.metricWindow.startTime,
    },
    {
      fetchPolicy: "store-or-network",
    },
  );

  return (
    <EnvironmentMetricsChart
      diskSpaceGb={props.diskSpaceGb}
      memoryGb={props.memoryGb}
      samples={data.EnvironmentMetricSamples}
    />
  );
}

/**
 * Owns the metrics-only query boundary so environment detail pages do not request chart samples
 * until operators open the metrics tab.
 */
export function EnvironmentMetricsTab(props: EnvironmentMetricsTabProps) {
  const [metricWindow, setMetricWindow] = useState<EnvironmentMetricWindowRange>(
    () => EnvironmentMetricWindow.createLastHour(),
  );

  useEffect(() => {
    setMetricWindow(EnvironmentMetricWindow.createLastHour());

    const intervalId = window.setInterval(() => {
      setMetricWindow(EnvironmentMetricWindow.createLastHour());
    }, metricsRefreshIntervalMilliseconds);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [props.environmentId]);

  return (
    <Suspense fallback={<EnvironmentMetricsTabFallback />}>
      <EnvironmentMetricsTabContent
        diskSpaceGb={props.diskSpaceGb}
        environmentId={props.environmentId}
        memoryGb={props.memoryGb}
        metricWindow={metricWindow}
      />
    </Suspense>
  );
}
