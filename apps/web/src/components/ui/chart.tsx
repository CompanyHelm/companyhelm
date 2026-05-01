import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = {
  [key: string]: {
    color?: string;
    label?: React.ReactNode;
  };
};

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart(): ChartContextValue {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("Chart components must be used inside ChartContainer.");
  }

  return context;
}

function ChartStyle({ config, id }: { config: ChartConfig; id: string }) {
  const styles = Object.entries(config)
    .map(([key, value]) => {
      if (!value.color) {
        return null;
      }

      return `[data-chart=${id}] { --color-${key}: ${value.color}; }`;
    })
    .filter((value): value is string => value !== null)
    .join("\n");

  if (styles.length === 0) {
    return null;
  }

  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
}

interface ChartContainerProps extends React.ComponentProps<"div"> {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}

export function ChartContainer({ children, className, config, ...props }: ChartContainerProps) {
  const chartId = React.useId().replace(/:/g, "");

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn("flex aspect-video justify-center text-xs", className)}
        data-chart={chartId}
        {...props}
      >
        <ChartStyle config={config} id={chartId} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

interface ChartTooltipPayloadItem {
  color?: string;
  dataKey?: string | number;
  value?: number | string;
}

interface ChartTooltipContentProps {
  active?: boolean;
  hideLabel?: boolean;
  indicator?: "line" | "dot";
  label?: React.ReactNode;
  payload?: ReadonlyArray<ChartTooltipPayloadItem>;
}

export function ChartTooltipContent(props: ChartTooltipContentProps) {
  const { config } = useChart();
  const { active, hideLabel = false, indicator = "dot", label, payload } = props;
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="min-w-40 rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-md">
      {!hideLabel ? <div className="mb-2 font-medium text-foreground">{label}</div> : null}
      <div className="grid gap-1.5">
        {payload.map((item: ChartTooltipPayloadItem) => {
          const dataKey = String(item.dataKey ?? "");
          const itemConfig = config[dataKey];
          const color = item.color ?? itemConfig?.color ?? "currentColor";
          return (
            <div className="flex items-center justify-between gap-3" key={dataKey}>
              <div className="flex items-center gap-2 text-muted-foreground">
                {indicator === "dot" ? (
                  <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                ) : (
                  <span className="h-0.5 w-3" style={{ backgroundColor: color }} />
                )}
                <span>{itemConfig?.label ?? dataKey}</span>
              </div>
              <span className="font-medium text-foreground">{item.value?.toLocaleString?.() ?? item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
