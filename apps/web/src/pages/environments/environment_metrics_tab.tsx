import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MetricsTabKey = "cpuUsedPct" | "memUsedBytes" | "diskUsedBytes";

interface EnvironmentMetricsTabProps {
  samples: ReadonlyArray<{
    cpuUsedPct: number | null | undefined;
    diskUsedBytes: number | null | undefined;
    memUsedBytes: number | null | undefined;
    sampledAt: string;
  }>;
}

const chartConfig: ChartConfig = {
  cpuUsedPct: {
    color: "hsl(var(--chart-1))",
    label: "CPU used %",
  },
  diskUsedBytes: {
    color: "hsl(var(--chart-3))",
    label: "Disk used",
  },
  memUsedBytes: {
    color: "hsl(var(--chart-2))",
    label: "Memory used",
  },
};

const metricsTabLabels: Record<MetricsTabKey, string> = {
  cpuUsedPct: "CPU used %",
  diskUsedBytes: "Disk used",
  memUsedBytes: "Memory used",
};

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

function hasMetricValue(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

/**
 * Renders the last hour of environment usage in a shadcn area chart with a selectable metric so
 * operators can inspect CPU, memory, and disk independently without mixing incompatible units.
 */
export function EnvironmentMetricsTab(props: EnvironmentMetricsTabProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricsTabKey>("cpuUsedPct");
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
  const latestMetricValue = latestSample && hasMetricValue(latestSample[selectedMetric])
    ? latestSample[selectedMetric]
    : null;

  return (
    <div className="grid gap-6 px-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Last 60 minutes</h2>
          <p className="text-sm text-muted-foreground">Minute-bucketed environment usage captured by the metrics worker.</p>
        </div>
        <div className="w-full max-w-56">
          <Select onValueChange={(value) => setSelectedMetric(value as MetricsTabKey)} value={selectedMetric}>
            <SelectTrigger>
              <SelectValue>{metricsTabLabels[selectedMetric]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cpuUsedPct">{metricsTabLabels.cpuUsedPct}</SelectItem>
              <SelectItem value="memUsedBytes">{metricsTabLabels.memUsedBytes}</SelectItem>
              <SelectItem value="diskUsedBytes">{metricsTabLabels.diskUsedBytes}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Latest sample</CardDescription>
          <CardTitle>{formatMetricValue(selectedMetric, latestMetricValue)}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-80 w-full" config={chartConfig}>
            <AreaChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
              <defs>
                <linearGradient id="fillMetric" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${selectedMetric})`} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={`var(--color-${selectedMetric})`} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="label" minTickGap={24} tickLine={false} tickMargin={8} />
              <YAxis
                axisLine={false}
                tickFormatter={(value: number) => formatAxisTick(selectedMetric, value)}
                tickLine={false}
                tickMargin={8}
                width={72}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel indicator="line" />} cursor={false} />
              <Area
                dataKey={selectedMetric}
                fill="url(#fillMetric)"
                fillOpacity={1}
                stroke={`var(--color-${selectedMetric})`}
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
